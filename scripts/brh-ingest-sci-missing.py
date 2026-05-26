#!/usr/bin/env python3
"""
Ingest les SIREN présents dans brh_dpe_prospects.owner_siren mais absents
de brh_sci_companies, via l'API publique recherche-entreprises.api.gouv.fr
(scale gratuit, décision D-2 du 21/05).

Source : https://recherche-entreprises.api.gouv.fr/search?q={siren}
Rate limit conseillé : 30 req/s (free tier généreux, on reste prudent à 25).

Usage :
  python3 scripts/brh-ingest-sci-missing.py --dry-run [--limit=N]
  python3 scripts/brh-ingest-sci-missing.py --live --limit=100  # smoke prod
  python3 scripts/brh-ingest-sci-missing.py --live              # full run (~2 800 SIREN)

Idempotent : ON CONFLICT (siren) DO NOTHING — re-lancer ne duplique pas.

Volume estimé (27/05) : 2 791 SIREN manquants → ~90s à 30 req/s + 1-2 min batch INSERT.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import date
from pathlib import Path
from urllib.parse import urlencode
import urllib.request
import urllib.error

import psycopg2
from psycopg2.extras import execute_values, RealDictCursor

API_BASE = "https://recherche-entreprises.api.gouv.fr"
THROTTLE_MS = 40   # ~25 req/s, marge sous le quota officiel (30 req/s anon)
DB_BATCH_SIZE = 200
DB_SLEEP_S = 0.2


def load_db_url() -> str:
    for line in Path("/opt/stack/.env").read_text().splitlines():
        if line.startswith("BRH_SUPABASE_DB_URL="):
            return line.split("=", 1)[1].strip().strip("\"'")
    raise RuntimeError("BRH_SUPABASE_DB_URL missing")


def fetch_company(siren: str) -> dict | None:
    """Fetch full company payload from recherche-entreprises.api.gouv.fr."""
    qs = urlencode({"q": siren})
    url = f"{API_BASE}/search?{qs}"
    req = urllib.request.Request(url, headers={"User-Agent": "BRH-Habitat/1.0 (ingest-sci-missing)"})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        if e.code == 429:
            time.sleep(2)
            return None
        if e.code == 404:
            return None
        print(f"  HTTP {e.code} on {siren}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"  Error on {siren}: {e}", file=sys.stderr)
        return None
    results = data.get("results") or []
    for r in results:
        if str(r.get("siren") or "") == siren:
            return r
    return results[0] if results else None


# Liste élargie de NAF "utility" / non-patrimonial — utilisée pour le flag is_utility.
# Sera renforcée par la migration 20260527110000 (entity_class).
UTILITY_NAF = {
    # Electricité
    "35.11Z", "35.12Z", "35.13Z", "35.14Z",
    # Gaz
    "35.21Z", "35.22Z", "35.23Z",
    # Eau / déchets
    "36.00Z", "37.00Z", "38.11Z", "38.12Z", "38.21Z", "38.22Z",
    # Pétrole
    "46.71Z",
    # Transport ferroviaire / poste
    "49.10Z", "49.20Z", "53.10Z", "53.20Z",
    # Télécoms / médias
    "60.10Z", "60.20A", "60.20B", "61.10Z", "61.20Z", "61.30Z", "61.90Z",
    # Bailleurs sociaux (OPH)
    "68.20A", "68.20B",
}


def is_utility_or_public(siren: str, naf: str | None) -> bool:
    """Détecte utilities, bailleurs sociaux et collectivités."""
    if naf and naf in UTILITY_NAF:
        return True
    # SIREN collectivités : préfixe 21/22 = communes, 25 = EPCI, 23 = régions, 13 = département
    if siren and siren[:2] in ("21", "22", "23", "13", "25"):
        return True
    return False


def transform_to_row(siren: str, payload: dict) -> dict:
    """Transforme un payload recherche-entreprises.api.gouv.fr en row brh_sci_companies."""
    denom = payload.get("nom_complet") or payload.get("nom_raison_sociale") or payload.get("nom_commercial") or ""
    siege = payload.get("siege") or {}
    activite = payload.get("activite_principale") or siege.get("activite_principale") or None
    forme = payload.get("nature_juridique") or None  # code numérique INSEE (ex: "6540")
    # capital social rarement exposé par cette API (vs Pappers payant)
    capital_cents = None

    # Dirigeants : enrichis depuis dirigeants[] de l'API
    dirs = []
    for d in (payload.get("dirigeants") or [])[:30]:
        if d.get("type_dirigeant") == "personne morale":
            continue
        dirs.append({
            "nom": d.get("nom") or None,
            "prenom": d.get("prenoms") or d.get("prenom") or None,
            "qualite": d.get("qualite") or None,
            "date_naissance": d.get("date_de_naissance") or None,
            "est_decede": False,
            "deces_date": None,
        })

    is_utility = is_utility_or_public(siren, activite)
    # Inactive si etat_administratif != 'A' (actif)
    etat = payload.get("etat_administratif") or "A"
    is_active = etat == "A"
    # Date création
    created_str = payload.get("date_creation") or None

    # code_postal contraint à 5 chars en DB (character(5)) → tronquer prudemment
    cp_raw = siege.get("code_postal") or None
    cp = (cp_raw[:5] if isinstance(cp_raw, str) else cp_raw) if cp_raw else None
    # Tronquer denomination à 250 chars (sécurité)
    denom_trunc = (denom or f"SIREN {siren}")[:250]

    return {
        "siren": siren,
        "denomination": denom_trunc,
        "forme_juridique": forme,
        "activite_principale": activite,
        "capital_social_cents": capital_cents,
        "commune": (siege.get("libelle_commune") or siege.get("commune") or None) and str(siege.get("libelle_commune") or siege.get("commune"))[:120],
        "code_postal": cp,
        "adresse_siege": (siege.get("geo_adresse") or siege.get("adresse") or None) and str(siege.get("geo_adresse") or siege.get("adresse"))[:250],
        "is_active": is_active,
        "is_utility": is_utility,
        "dirigeants": json.dumps(dirs, ensure_ascii=False),
        "date_creation": created_str,
        "has_deceased_dirigeant": False,
        "succession_probable_score": 0,
        "ingest_source": "recherche-entreprises.api.gouv.fr",
        "ingest_at": date.today().isoformat(),
    }


def fetch_missing_sirens(conn) -> list[str]:
    cur = conn.cursor()
    cur.execute("""
        SELECT DISTINCT p.owner_siren
        FROM brh_dpe_prospects p
        WHERE p.owner_siren IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM brh_sci_companies s WHERE s.siren = p.owner_siren)
        ORDER BY p.owner_siren
    """)
    sirens = [r[0] for r in cur.fetchall()]
    cur.close()
    return sirens


def get_table_columns(conn, table: str) -> set[str]:
    """Inspect schema réel pour ne tenter d'INSERT que sur les colonnes existantes."""
    cur = conn.cursor()
    cur.execute("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = %s AND table_schema = 'public'
    """, (table,))
    cols = {r[0] for r in cur.fetchall()}
    cur.close()
    return cols


def insert_rows(conn, rows: list[dict], dry_run: bool):
    if not rows:
        return 0
    columns = get_table_columns(conn, "brh_sci_companies")
    # On ne garde que les clés présentes en table (les rows ont des champs candidats).
    keys = [k for k in rows[0].keys() if k in columns]
    if not keys:
        print("Aucune colonne ne matche le schéma de brh_sci_companies !", file=sys.stderr)
        return 0
    if dry_run:
        print(f"[DRY-RUN] inserts schémas valides : {len(rows)} rows × {len(keys)} colonnes ({', '.join(keys)})")
        return 0
    cur = conn.cursor()
    values = [tuple(r.get(k) for k in keys) for r in rows]
    placeholders = ", ".join(keys)
    sql = f"""
        INSERT INTO brh_sci_companies ({placeholders})
        VALUES %s
        ON CONFLICT (siren) DO NOTHING
    """
    execute_values(cur, sql, values, page_size=DB_BATCH_SIZE)
    conn.commit()
    inserted = cur.rowcount
    cur.close()
    return inserted


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="Fetch + transform sans INSERT (par défaut)")
    ap.add_argument("--live", action="store_true", help="INSERT réel en prod (nécessite confirmation)")
    ap.add_argument("--limit", type=int, default=None, help="Limite N SIREN (utile pour smoke)")
    ap.add_argument("--start-from", type=int, default=0, help="Skip N premiers SIREN (reprise)")
    args = ap.parse_args()

    if not args.live:
        args.dry_run = True

    conn = psycopg2.connect(load_db_url())
    sirens = fetch_missing_sirens(conn)
    if args.start_from:
        sirens = sirens[args.start_from:]
    if args.limit:
        sirens = sirens[: args.limit]

    print(f"SIREN à traiter : {len(sirens):,} (dry-run={args.dry_run})")
    print(f"Estimation durée : {len(sirens) * THROTTLE_MS / 1000:.0f}s API + {len(sirens) // DB_BATCH_SIZE * DB_SLEEP_S:.0f}s DB")
    print()

    rows: list[dict] = []
    total_inserted = 0
    total_failed = 0
    t0 = time.time()
    for i, siren in enumerate(sirens, 1):
        payload = fetch_company(siren)
        if payload is None:
            total_failed += 1
        else:
            try:
                rows.append(transform_to_row(siren, payload))
            except Exception as e:
                print(f"  Transform fail {siren}: {e}", file=sys.stderr)
                total_failed += 1
        if i % 50 == 0:
            elapsed = time.time() - t0
            rate = i / elapsed if elapsed > 0 else 0
            eta = (len(sirens) - i) / rate if rate > 0 else 0
            print(f"  {i:5d}/{len(sirens)} | {rate:.1f} req/s | ETA {eta:.0f}s | {total_failed} fail")
        # Flush batch
        if len(rows) >= DB_BATCH_SIZE:
            inserted = insert_rows(conn, rows, args.dry_run)
            total_inserted += inserted
            rows = []
            time.sleep(DB_SLEEP_S)
        time.sleep(THROTTLE_MS / 1000)
    if rows:
        total_inserted += insert_rows(conn, rows, args.dry_run)

    elapsed = time.time() - t0
    print()
    print(f"Terminé en {elapsed:.1f}s")
    print(f"  inserts : {total_inserted}")
    print(f"  fails   : {total_failed}")
    conn.close()


if __name__ == "__main__":
    main()
