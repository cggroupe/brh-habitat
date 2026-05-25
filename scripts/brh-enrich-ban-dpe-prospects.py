#!/usr/bin/env python3
"""
Enrichit brh_dpe_prospects avec adresse_ban_id via api-adresse.data.gouv.fr.

Stratégie (calqué sur brh-enrich-ban-personnes.py, adapté pour DPE) :
  - Pagination 1000 lignes (id INTEGER vs UUID pour personnes).
  - Pour chaque ligne : call BAN search?q={numero_norm voie_norm}&postcode={cp}&limit=1.
  - Throttle : 25 req/s (1 req toutes les 40ms).
  - Batch UPDATE par 100 lignes via Management API.
  - Sleep 0.5s entre batches (anti-saturation DB).
  - Idempotent : re-lancer ne re-traite que les NULL.
  - Note : on n'écrit QUE adresse_ban_id, _score, _enriched_at
    (lat/lng + label existent déjà via enrichissement antérieur).

Usage :
  python3 scripts/brh-enrich-ban-dpe-prospects.py [--limit=N] [--dept=29] [--dry-run]

Volume : ~206k DPE → ~2-3 h wall-clock (vs 50 min pour 18k personnes).
"""
from __future__ import annotations

import argparse
import json
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
    return {
        "id": props.get("id"),
        "score": score,
    }


def update_batch(updates: list[dict]) -> int:
    """UPDATE multiple rows via VALUES + UPDATE FROM construct."""
    if not updates:
        return 0
    values_parts = []
    for u in updates:
        values_parts.append(
            f"({u['id']}, "
            f"{sql_escape(u['ban_id'])}, "
            f"{u['score']})"
        )
    values_sql = ",\n  ".join(values_parts)
    sql = f"""
UPDATE brh_dpe_prospects p
SET
  adresse_ban_id = v.ban_id,
  adresse_ban_score = v.score::numeric,
  adresse_ban_enriched_at = now()
FROM (VALUES
  {values_sql}
) AS v(id, ban_id, score)
WHERE p.id = v.id
"""
    db_query(sql)
    return len(updates)


def fetch_to_enrich(limit: int, dept_filter: str | None) -> list[dict]:
    cp_filter = ""
    if dept_filter:
        cp_filter = f"AND code_postal LIKE '{dept_filter}%'"
    sql = f"""
SELECT id, numero_norm, voie_norm, code_postal
FROM brh_dpe_prospects
WHERE adresse_ban_enriched_at IS NULL
  AND voie_norm IS NOT NULL
  AND code_postal IS NOT NULL
  {cp_filter}
ORDER BY id
LIMIT {limit}
"""
    return db_query(sql)


def mark_failed(ids: list[int]) -> None:
    """Marque les rows tested mais sans hit (évite de re-tester à l'infini)."""
    if not ids:
        return
    ids_sql = ",".join(str(i) for i in ids)
    sql = f"""
UPDATE brh_dpe_prospects
SET adresse_ban_enriched_at = now()
WHERE id IN ({ids_sql})
"""
    db_query(sql)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="Limite globale (0 = tout)")
    ap.add_argument("--dept", type=str, default=None, help="Filtre département (22, 29, 35, 44, 56)")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    cp_filter = f"AND code_postal LIKE '{args.dept}%'" if args.dept else ""
    remaining = db_query(
        f"SELECT count(*) AS c FROM brh_dpe_prospects "
        f"WHERE adresse_ban_enriched_at IS NULL AND voie_norm IS NOT NULL "
        f"AND code_postal IS NOT NULL {cp_filter}"
    )[0]["c"]
    print(f"À enrichir : {remaining} DPE" + (f" (dept {args.dept})" if args.dept else ""), file=sys.stderr)

    if args.dry_run:
        rows = fetch_to_enrich(5, args.dept)
        print("Dry-run sample (5) :", file=sys.stderr)
        for r in rows:
            print(f"  id={r['id']} {r['numero_norm'] or ''} {r['voie_norm']} {r['code_postal']}", file=sys.stderr)
            hit = ban_search(r["numero_norm"], r["voie_norm"], r["code_postal"])
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

        for i in range(0, len(updates_with_hit), DB_BATCH_SIZE):
            chunk = updates_with_hit[i:i + DB_BATCH_SIZE]
            update_batch(chunk)
            time.sleep(DB_SLEEP_S)

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
