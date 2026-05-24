#!/usr/bin/env python3
"""
Enrichit brh_personnes_historique avec adresse_ban_id via api-adresse.data.gouv.fr.

Stratégie :
  - Pagination 1000 lignes depuis brh_personnes_historique (WHERE non encore enrichi).
  - Pour chaque ligne : call BAN search?q={adresse}&postcode={cp}&limit=1.
  - Throttle : 25 req/s (1 req toutes les 40ms).
  - Batch UPDATE par 100 lignes via Management API.
  - Sleep 0.5s entre batches (anti-saturation DB).
  - Idempotent : re-lancer ne re-traite que les NULL.

Usage :
  python3 scripts/brh-enrich-ban-personnes.py [--limit=N] [--dept=29] [--dry-run]

Volume : 18 218 personnes avec adresse → ~15-25 min wall-clock.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import time
from pathlib import Path
from urllib.parse import urlencode

import urllib.request
import urllib.error

PROJECT_REF = "lygmmvxnmvlgynmrcpny"
BAN_BASE = "https://api-adresse.data.gouv.fr"
PAGE_SIZE = 1000
DB_BATCH_SIZE = 100
THROTTLE_MS = 40  # ~25 req/s
DB_SLEEP_S = 0.5
MIN_SCORE = 0.5


def load_token() -> str:
    for line in Path("/opt/stack/.env").read_text().splitlines():
        if line.startswith("SUPABASE_ACCESS_TOKEN="):
            return line.split("=", 1)[1].strip().strip("\"'")
    raise RuntimeError("SUPABASE_ACCESS_TOKEN missing")


TOKEN = load_token()


def db_query(sql: str) -> list[dict]:
    payload = json.dumps({"query": sql})
    result = subprocess.run(
        [
            "curl", "-s",
            f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query",
            "-H", f"Authorization: Bearer {TOKEN}",
            "-H", "Content-Type: application/json",
            "-d", payload,
        ],
        capture_output=True, text=True, check=True,
    )
    data = json.loads(result.stdout)
    if isinstance(data, dict) and "message" in data:
        raise RuntimeError(f"DB error: {data['message']}")
    return data


def sql_escape(s: str | None) -> str:
    if s is None:
        return "NULL"
    return "'" + s.replace("'", "''") + "'"


def ban_search(adresse: str, code_postal: str) -> dict | None:
    """Returns top BAN hit (>= MIN_SCORE) or None."""
    q = adresse.strip()[:100]
    params = {"q": q, "postcode": code_postal, "limit": 1, "autocomplete": 0}
    url = f"{BAN_BASE}/search/?" + urlencode(params)
    try:
        with urllib.request.urlopen(url, timeout=8) as resp:
            data = json.loads(resp.read())
    except (urllib.error.URLError, json.JSONDecodeError, TimeoutError):
        return None
    features = data.get("features", [])
    if not features:
        return None
    f = features[0]
    props = f.get("properties", {})
    score = props.get("score")
    if score is None or score < MIN_SCORE:
        return None
    coords = (f.get("geometry") or {}).get("coordinates") or [None, None]
    return {
        "id": props.get("id"),
        "score": score,
        "label": props.get("label"),
        "lon": coords[0],
        "lat": coords[1],
    }


def update_batch(updates: list[dict]) -> int:
    """UPDATE multiple rows via VALUES + UPDATE FROM construct."""
    if not updates:
        return 0
    # Build VALUES list
    values_parts = []
    now_iso = "now()"
    for u in updates:
        values_parts.append(
            f"({sql_escape(u['id'])}, "
            f"{sql_escape(u['ban_id']) if u['ban_id'] else 'NULL'}, "
            f"{u['score'] if u['score'] is not None else 'NULL'}, "
            f"{u['lat'] if u['lat'] is not None else 'NULL'}, "
            f"{u['lon'] if u['lon'] is not None else 'NULL'}, "
            f"{sql_escape(u['label']) if u['label'] else 'NULL'})"
        )
    values_sql = ",\n  ".join(values_parts)
    sql = f"""
UPDATE brh_personnes_historique p
SET
  adresse_ban_id = v.ban_id,
  adresse_ban_score = v.score::numeric,
  adresse_ban_lat = v.lat::numeric,
  adresse_ban_lon = v.lon::numeric,
  adresse_ban_label = v.label,
  adresse_ban_enriched_at = {now_iso}
FROM (VALUES
  {values_sql}
) AS v(id, ban_id, score, lat, lon, label)
WHERE p.id = v.id::uuid
"""
    db_query(sql)
    return len(updates)


def fetch_to_enrich(limit: int, dept_filter: str | None) -> list[dict]:
    cp_filter = ""
    if dept_filter:
        # dept '29' → cp LIKE '29%'
        cp_filter = f"AND code_postal LIKE '{dept_filter}%'"
    sql = f"""
SELECT id::text AS id, adresse, code_postal, ville
FROM brh_personnes_historique
WHERE adresse_ban_enriched_at IS NULL
  AND adresse IS NOT NULL
  AND code_postal IS NOT NULL
  {cp_filter}
ORDER BY id
LIMIT {limit}
"""
    return db_query(sql)


def mark_failed(ids: list[str]) -> None:
    """Marque les rows tested mais sans hit (évite de re-tester à l'infini)."""
    if not ids:
        return
    ids_sql = ",".join(sql_escape(i) for i in ids)
    sql = f"""
UPDATE brh_personnes_historique
SET adresse_ban_enriched_at = now()
WHERE id IN ({ids_sql})::uuid[]
"""
    # Cast IN simpler form
    sql = f"""
UPDATE brh_personnes_historique
SET adresse_ban_enriched_at = now()
WHERE id::text = ANY (ARRAY[{ids_sql}])
"""
    db_query(sql)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="Limite globale (0 = tout)")
    ap.add_argument("--dept", type=str, default=None, help="Filtre département (22, 29, 35, 44, 56)")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    # Count restant
    cp_filter = f"AND code_postal LIKE '{args.dept}%'" if args.dept else ""
    remaining = db_query(
        f"SELECT count(*) AS c FROM brh_personnes_historique "
        f"WHERE adresse_ban_enriched_at IS NULL AND adresse IS NOT NULL {cp_filter}"
    )[0]["c"]
    print(f"À enrichir : {remaining} personnes" + (f" (dept {args.dept})" if args.dept else ""), file=sys.stderr)

    if args.dry_run:
        rows = fetch_to_enrich(5, args.dept)
        print("Dry-run sample (5) :", file=sys.stderr)
        for r in rows:
            print(f"  {r['id'][:8]}... {r['adresse']} {r['code_postal']}", file=sys.stderr)
            hit = ban_search(r["adresse"], r["code_postal"])
            print(f"    → BAN: {hit}", file=sys.stderr)
            time.sleep(THROTTLE_MS / 1000)
        return 0

    target_total = args.limit if args.limit > 0 else remaining
    processed = 0
    found = 0
    not_found = 0
    started = time.time()

    while processed < target_total:
        page_limit = min(PAGE_SIZE, target_total - processed)
        rows = fetch_to_enrich(page_limit, args.dept)
        if not rows:
            break

        updates_with_hit: list[dict] = []
        no_hit_ids: list[str] = []

        for row in rows:
            time.sleep(THROTTLE_MS / 1000)
            hit = ban_search(row["adresse"], row["code_postal"])
            if hit:
                updates_with_hit.append({
                    "id": row["id"],
                    "ban_id": hit["id"],
                    "score": hit["score"],
                    "lat": hit["lat"],
                    "lon": hit["lon"],
                    "label": hit["label"],
                })
                found += 1
            else:
                no_hit_ids.append(row["id"])
                not_found += 1

        # UPDATE batch hits par chunks de DB_BATCH_SIZE
        for i in range(0, len(updates_with_hit), DB_BATCH_SIZE):
            chunk = updates_with_hit[i:i + DB_BATCH_SIZE]
            update_batch(chunk)
            time.sleep(DB_SLEEP_S)

        # Marquer les no-hit comme "enrichis" (enriched_at = now mais adresse_ban_id reste NULL)
        if no_hit_ids:
            for i in range(0, len(no_hit_ids), DB_BATCH_SIZE):
                chunk = no_hit_ids[i:i + DB_BATCH_SIZE]
                mark_failed(chunk)
                time.sleep(DB_SLEEP_S)

        processed += len(rows)
        elapsed = time.time() - started
        rate = processed / elapsed if elapsed else 0
        eta = (target_total - processed) / rate if rate else 0
        print(
            f"[{processed}/{target_total}] found={found} miss={not_found} "
            f"({rate:.1f}/s, ETA {eta/60:.1f}min)",
            file=sys.stderr,
        )

    elapsed_total = time.time() - started
    print(f"\n✅ Terminé : {processed} traités, {found} BAN id trouvés ({found*100//max(1,processed)}%), {elapsed_total/60:.1f} min", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
