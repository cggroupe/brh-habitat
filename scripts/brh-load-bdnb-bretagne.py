#!/usr/bin/env python3
"""
Load les CSV BDNB Bretagne (extraits depuis postgis local) vers Supabase.

Source CSV : /tmp/bdnb-extract/dep{22,29,35,56}.csv
Cible Supabase : public.brh_ext_bdnb_batiments (créée migration 20260525130000)

Stratégie : COPY FROM STDIN via psycopg2 (100× plus rapide qu'INSERT batches).
ON CONFLICT (batiment_groupe_id) DO UPDATE pour idempotence.

Volume : ~1.55M rows. ETA : ~2-5 min total via COPY (vs 30-45 min INSERT batches).

Usage : python3 scripts/brh-load-bdnb-bretagne.py [--dept=22]
"""
from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

import psycopg2


def load_db_url() -> str:
    for line in Path("/opt/stack/.env").read_text().splitlines():
        if line.startswith("BRH_SUPABASE_DB_URL="):
            return line.split("=", 1)[1].strip().strip("\"'")
    raise RuntimeError("BRH_SUPABASE_DB_URL missing")


def load_dept(conn, dept: str) -> int:
    csv_path = Path(f"/tmp/bdnb-extract/dep{dept}.csv")
    if not csv_path.exists():
        print(f"  ⚠️  {csv_path} not found, skipping", file=sys.stderr)
        return 0

    # On utilise une table temp pour permettre l'UPSERT
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TEMP TABLE _bdnb_tmp (LIKE public.brh_ext_bdnb_batiments INCLUDING DEFAULTS)
            ON COMMIT DROP
        """)
        with csv_path.open("r", encoding="utf-8") as f:
            cur.copy_expert(
                "COPY _bdnb_tmp (batiment_groupe_id, ban_id, dept, annee_construction, "
                "mat_mur_txt, mat_toit_txt, nb_niveau, nb_log, surface_habitable_logement, "
                "type_vitrage) FROM STDIN WITH CSV HEADER",
                f,
            )
        cur.execute("SELECT count(*) FROM _bdnb_tmp")
        loaded = cur.fetchone()[0]

        cur.execute("""
            INSERT INTO public.brh_ext_bdnb_batiments
            (batiment_groupe_id, ban_id, dept, annee_construction, mat_mur_txt,
             mat_toit_txt, nb_niveau, nb_log, surface_habitable_logement, type_vitrage)
            SELECT batiment_groupe_id, ban_id, dept, annee_construction, mat_mur_txt,
                   mat_toit_txt, nb_niveau, nb_log, surface_habitable_logement, type_vitrage
            FROM _bdnb_tmp
            ON CONFLICT (batiment_groupe_id) DO UPDATE
            SET ban_id = EXCLUDED.ban_id,
                annee_construction = EXCLUDED.annee_construction,
                mat_mur_txt = EXCLUDED.mat_mur_txt,
                mat_toit_txt = EXCLUDED.mat_toit_txt,
                nb_niveau = EXCLUDED.nb_niveau,
                nb_log = EXCLUDED.nb_log,
                surface_habitable_logement = EXCLUDED.surface_habitable_logement,
                type_vitrage = EXCLUDED.type_vitrage,
                ingested_at = now()
        """)
        upserted = cur.rowcount
    conn.commit()
    return upserted


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dept", type=str, default=None, help="Filtre département (22, 29, 35, 56)")
    args = ap.parse_args()

    depts = [args.dept] if args.dept else ["22", "29", "35", "56"]
    url = load_db_url()
    conn = psycopg2.connect(url)
    print(f"Connected to Supabase. Loading {len(depts)} dept(s).", file=sys.stderr)

    total_loaded = 0
    started = time.time()
    for dept in depts:
        t0 = time.time()
        print(f"=== dept {dept} ===", file=sys.stderr)
        try:
            loaded = load_dept(conn, dept)
            total_loaded += loaded
            elapsed = time.time() - t0
            print(f"  ✅ {loaded} rows upserted in {elapsed:.1f}s "
                  f"({loaded/max(elapsed,0.01):.0f} rows/s)", file=sys.stderr)
        except Exception as e:
            print(f"  ❌ ERROR dept {dept}: {e}", file=sys.stderr)
            conn.rollback()

    conn.close()
    elapsed_total = time.time() - started
    print(f"\n✅ Total : {total_loaded} rows in {elapsed_total/60:.1f} min", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
