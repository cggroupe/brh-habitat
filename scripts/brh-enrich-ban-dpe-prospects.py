#!/usr/bin/env python3
"""
Enrichit brh_dpe_prospects avec adresse_ban_id via api-adresse.data.gouv.fr.

Stratégie v2 (25/05 PM, perf 10× via psycopg2 direct) :
  - Pagination 1000 lignes via psycopg2 vers le pooler Supabase (port 5432)
    au lieu de Management API curl (latence 500ms/UPDATE → 50ms).
  - Pour chaque ligne : call BAN search?q={numero_norm voie_norm}&postcode={cp}&limit=1.
  - Throttle : 25 req/s (1 req toutes les 40ms).
  - Batch UPDATE par 500 lignes via execute_values (bulk INSERT depuis VALUES).
  - Sleep 0.1s entre batches (anti-saturation pool, mais réduit vs v1).
  - Idempotent : re-lancer ne re-traite que les NULL.
  - Note : on n'écrit QUE adresse_ban_id, _score, _enriched_at
    (lat/lng + label existent déjà via enrichissement antérieur).

Usage :
  python3 scripts/brh-enrich-ban-dpe-prospects.py [--limit=N] [--dept=29] [--dry-run]

Parallélisation : lancer 5 instances avec --dept différent pour 5× speed.
  for d in 22 29 35 44 56; do
    nohup python3 scripts/brh-enrich-ban-dpe-prospects.py --dept=$d \
      > /tmp/brh-enrich-ban-dpe-$d.log 2>&1 &
  done

Volume : ~206k DPE → ~30-60 min wall-clock avec 5 workers parallèles.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path
from urllib.parse import urlencode

import urllib.request
import urllib.error

import psycopg2
from psycopg2.extras import execute_values, RealDictCursor

BAN_BASE = "https://api-adresse.data.gouv.fr"
PAGE_SIZE = 1000
DB_BATCH_SIZE = 500
THROTTLE_MS = 40  # ~25 req/s
DB_SLEEP_S = 0.1
MIN_SCORE = 0.5


def load_db_url() -> str:
    for line in Path("/opt/stack/.env").read_text().splitlines():
        if line.startswith("BRH_SUPABASE_DB_URL="):
            return line.split("=", 1)[1].strip().strip("\"'")
    raise RuntimeError("BRH_SUPABASE_DB_URL missing")


def ban_search(numero: str | None, voie: str, code_postal: str) -> dict | None:
    """Returns top BAN hit (>= MIN_SCORE) or None."""
    q_parts = []
    if numero:
        q_parts.append(numero.strip())
    q_parts.append(voie.strip())
    q = " ".join(q_parts)[:100]
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
    return {"id": props.get("id"), "score": score}


def update_batch(conn, updates: list[dict]) -> int:
    """UPSERT batch via execute_values + UPDATE FROM VALUES."""
    if not updates:
        return 0
    rows = [(u["id"], u["ban_id"], float(u["score"])) for u in updates]
    sql = """
    UPDATE brh_dpe_prospects p
    SET
      adresse_ban_id = v.ban_id,
      adresse_ban_score = v.score::numeric,
      adresse_ban_enriched_at = now()
    FROM (VALUES %s) AS v(id, ban_id, score)
    WHERE p.id = v.id
    """
    with conn.cursor() as cur:
        execute_values(cur, sql, rows, template="(%s, %s, %s)")
        rowcount = cur.rowcount
    conn.commit()
    return rowcount


def mark_failed(conn, ids: list[int]) -> None:
    """Marque les rows tested mais sans hit."""
    if not ids:
        return
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE brh_dpe_prospects SET adresse_ban_enriched_at = now() WHERE id = ANY (%s)",
            (ids,),
        )
    conn.commit()


def fetch_to_enrich(conn, limit: int, dept_filter: str | None) -> list[dict]:
    cp_filter = ""
    params = (limit,)
    if dept_filter:
        cp_filter = "AND code_postal LIKE %s"
        params = (f"{dept_filter}%", limit)
    sql = f"""
    SELECT id, numero_norm, voie_norm, code_postal
    FROM brh_dpe_prospects
    WHERE adresse_ban_enriched_at IS NULL
      AND voie_norm IS NOT NULL
      AND code_postal IS NOT NULL
      {cp_filter}
    ORDER BY id
    LIMIT %s
    """
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(sql, params)
        return [dict(r) for r in cur.fetchall()]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="Limite globale (0 = tout)")
    ap.add_argument("--dept", type=str, default=None, help="Filtre département (22, 29, 35, 44, 56)")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    conn = psycopg2.connect(load_db_url())

    cp_filter = ""
    params: tuple = ()
    if args.dept:
        cp_filter = "AND code_postal LIKE %s"
        params = (f"{args.dept}%",)
    with conn.cursor() as cur:
        cur.execute(
            f"SELECT count(*) FROM brh_dpe_prospects "
            f"WHERE adresse_ban_enriched_at IS NULL AND voie_norm IS NOT NULL "
            f"AND code_postal IS NOT NULL {cp_filter}",
            params,
        )
        remaining = cur.fetchone()[0]
    print(
        f"À enrichir : {remaining} DPE"
        + (f" (dept {args.dept})" if args.dept else ""),
        file=sys.stderr,
    )

    if args.dry_run:
        rows = fetch_to_enrich(conn, 5, args.dept)
        print("Dry-run sample (5) :", file=sys.stderr)
        for r in rows:
            print(f"  id={r['id']} {r['numero_norm'] or ''} {r['voie_norm']} {r['code_postal']}",
                  file=sys.stderr)
            hit = ban_search(r["numero_norm"], r["voie_norm"], r["code_postal"])
            print(f"    → BAN: {hit}", file=sys.stderr)
            time.sleep(THROTTLE_MS / 1000)
        conn.close()
        return 0

    target_total = args.limit if args.limit > 0 else remaining
    processed = 0
    found = 0
    not_found = 0
    started = time.time()

    while processed < target_total:
        page_limit = min(PAGE_SIZE, target_total - processed)
        rows = fetch_to_enrich(conn, page_limit, args.dept)
        if not rows:
            break

        updates_with_hit: list[dict] = []
        no_hit_ids: list[int] = []

        for row in rows:
            time.sleep(THROTTLE_MS / 1000)
            hit = ban_search(row["numero_norm"], row["voie_norm"], row["code_postal"])
            if hit:
                updates_with_hit.append({
                    "id": row["id"],
                    "ban_id": hit["id"],
                    "score": hit["score"],
                })
                found += 1
            else:
                no_hit_ids.append(row["id"])
                not_found += 1

        # UPSERT hits par chunks de DB_BATCH_SIZE
        for i in range(0, len(updates_with_hit), DB_BATCH_SIZE):
            chunk = updates_with_hit[i:i + DB_BATCH_SIZE]
            update_batch(conn, chunk)
            time.sleep(DB_SLEEP_S)

        # Mark no-hits
        if no_hit_ids:
            for i in range(0, len(no_hit_ids), DB_BATCH_SIZE):
                chunk = no_hit_ids[i:i + DB_BATCH_SIZE]
                mark_failed(conn, chunk)
                time.sleep(DB_SLEEP_S)

        processed += len(rows)
        elapsed = time.time() - started
        rate = processed / elapsed if elapsed else 0
        eta = (target_total - processed) / rate if rate else 0
        dept_tag = f"[dept {args.dept}] " if args.dept else ""
        print(
            f"{dept_tag}[{processed}/{target_total}] found={found} miss={not_found} "
            f"({rate:.1f}/s, ETA {eta/60:.1f}min)",
            file=sys.stderr,
        )

    elapsed_total = time.time() - started
    dept_tag = f"[dept {args.dept}] " if args.dept else ""
    print(
        f"\n{dept_tag}✅ Terminé : {processed} traités, {found} BAN id trouvés "
        f"({found*100//max(1,processed)}%), {elapsed_total/60:.1f} min",
        file=sys.stderr,
    )
    conn.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
