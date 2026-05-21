#!/usr/bin/env python3
"""
brh-enrich-insee-dpe-e.py
─────────────────────────────────────
Phase nocturne 21/05 — Enrichissement code INSEE commune sur DPE E.

CONTEXTE :
  124 630 DPE classe E ingérés Phase 7+8.2 ont latitude/longitude mais
  PAS d'iris_code ni de code INSEE commune dans brh_dpe_prospects.
  → Les règles score V2 dépendant de brh_ext_commune ne s'activent pas
    (avg score E = 5 fixe au lieu de 0-100).

ACTION :
  Pour chaque DPE E avec lat/lng, appeler API BAN reverse pour récupérer
  le code INSEE commune (citycode). Stocker dans nouvelle colonne
  `code_insee` sur brh_dpe_prospects.

NOTE IRIS :
  L'API BAN ne fournit pas l'IRIS (limite officielle). Pour IRIS, il
  faudrait API IGN ou Cartelie INSEE (plus complexe). Le code INSEE
  commune débloque déjà les 8 règles communales du score V2.

PERF :
  - API BAN gratuit, ~10 req/s
  - 124 630 DPE → ~3-4h théorique
  - Batch de 1000 lat,lng en POST par requête (API BAN batch)
"""
from __future__ import annotations

import io
import os
import sys
import time
import csv
from typing import Any

import psycopg
import requests

SUPA_DSN = os.environ["BRH_SUPABASE_DB_URL"]
BAN_REVERSE_BATCH_URL = "https://api-adresse.data.gouv.fr/reverse/csv/"
BATCH_SIZE = 1000  # API BAN batch reverse


def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def ensure_column(conn):
    """Ajoute la colonne code_insee si pas déjà présente."""
    with conn.cursor() as cur:
        cur.execute("""
            ALTER TABLE public.brh_dpe_prospects
              ADD COLUMN IF NOT EXISTS code_insee text;
            CREATE INDEX IF NOT EXISTS idx_brh_dpe_prospects_insee
              ON public.brh_dpe_prospects (code_insee)
              WHERE code_insee IS NOT NULL;
        """)
        conn.commit()
    log("Colonne code_insee + index OK")


def fetch_batch(conn, limit: int) -> list[dict]:
    """Récupère un batch de DPE E sans code INSEE avec lat/lng."""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT id, latitude AS lat, longitude AS lng
              FROM public.brh_dpe_prospects
             WHERE etiquette_dpe = 'E'
               AND latitude IS NOT NULL
               AND longitude IS NOT NULL
               AND code_insee IS NULL
             ORDER BY id
             LIMIT %s
        """, (limit,))
        cols = [c.name for c in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]


def reverse_geocode_batch(rows: list[dict]) -> dict[int, str]:
    """Appelle API BAN reverse en batch. Retourne dict {dpe_id: code_insee}."""
    # Format CSV requis par API BAN
    csv_buf = io.StringIO()
    writer = csv.writer(csv_buf)
    writer.writerow(["id", "lat", "lng"])
    for r in rows:
        writer.writerow([r["id"], r["lat"], r["lng"]])
    csv_buf.seek(0)

    files = {"data": ("input.csv", csv_buf.getvalue(), "text/csv")}
    params = {"columns": "lat", "columns": "lng"}  # noqa: F601
    # API attend: columns=lat&columns=lng en query string
    url = BAN_REVERSE_BATCH_URL + "?columns=lat&columns=lng"

    try:
        r = requests.post(url, files=files, timeout=120)
        if r.status_code != 200:
            log(f"  BAN HTTP {r.status_code}: {r.text[:200]}")
            return {}
        # Réponse = CSV avec colonnes ajoutées result_citycode etc.
        out = {}
        reader = csv.DictReader(io.StringIO(r.text))
        for row in reader:
            dpe_id = row.get("id")
            insee = row.get("result_citycode")
            if dpe_id and insee:
                out[int(dpe_id)] = insee
        return out
    except requests.RequestException as e:
        log(f"  BAN request err: {e}")
        return {}


def update_batch(conn, mapping: dict[int, str]) -> int:
    """UPDATE batch via VALUES clause."""
    if not mapping:
        return 0
    values_sql = ",".join(f"({did},'{insee}')" for did, insee in mapping.items())
    with conn.cursor() as cur:
        cur.execute(f"""
            UPDATE public.brh_dpe_prospects p
               SET code_insee = v.insee
              FROM (VALUES {values_sql}) AS v(dpe_id, insee)
             WHERE p.id = v.dpe_id
        """)
        conn.commit()
        return cur.rowcount


def main():
    t0 = time.time()
    log("Connexion DB...")
    conn = psycopg.connect(SUPA_DSN, autocommit=False)
    ensure_column(conn)

    total_updated = 0
    iteration = 0
    while True:
        batch = fetch_batch(conn, BATCH_SIZE)
        if not batch:
            log("  fin : plus de DPE E à enrichir")
            break
        iteration += 1
        log(f"  Batch {iteration} : {len(batch)} DPE → API BAN reverse...")
        mapping = reverse_geocode_batch(batch)
        n = update_batch(conn, mapping)
        total_updated += n
        log(f"  Batch {iteration} : {n} updated (total {total_updated})")
        # Sleep entre batches (politesse API BAN + respiration pool Supabase)
        time.sleep(2)

    conn.close()
    log(f"")
    log(f"═══ TOTAL : {total_updated} DPE E enrichis avec code INSEE en {time.time()-t0:.0f}s ═══")


if __name__ == "__main__":
    main()
