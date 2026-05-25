#!/usr/bin/env python3
"""
Enrichit `brh_dpe_prospects.iris_code` via point-in-polygon avec le shapefile
contours-iris IGN 2024.

Stratégie :
  - Charge les ~50k polygones IRIS France métro (Lambert93 EPSG:2154).
  - Filtre Bretagne + Loire-Atlantique (22/29/35/44/56) → ~2 246 polygones.
  - Construit un R-tree spatial index pour query O(log n).
  - Stream les DPE WHERE lat/lng IS NOT NULL AND iris_code IS NULL par pages 5 000.
  - Reproject lat/lng (WGS84) → Lambert93 (EPSG:2154).
  - Pour chaque DPE : spatial query → IRIS contenant le point.
  - Batch UPDATE 500 lignes par chunk via Management API.

Volume : 146 967 DPE à enrichir → ETA ~5-10 min.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from pathlib import Path

import geopandas as gpd
from shapely.geometry import Point
from shapely.strtree import STRtree
from pyproj import Transformer

PROJECT_REF = "lygmmvxnmvlgynmrcpny"
SHAPEFILE = Path(
    "/opt/stack/iris-data/CONTOURS-IRIS_3-0__SHP_LAMB93_FXX_2024-01-01/"
    "CONTOURS-IRIS/1_DONNEES_LIVRAISON_2024-12-00164/"
    "CONTOURS-IRIS_3-0_SHP_LAMB93_FXX-ED2024-01-01/CONTOURS-IRIS.shp"
)
PAGE = 5000
DB_BATCH = 500
DB_SLEEP_S = 0.5


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


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--depts", default="22,29,35,44,56", help="Depts (comma)")
    ap.add_argument("--limit", type=int, default=0, help="Limite globale (0 = tout)")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    depts = args.depts.split(",")

    print(f"📥 Loading IRIS shapefile (1× ~150 MB load)...", file=sys.stderr)
    t0 = time.time()
    gdf = gpd.read_file(SHAPEFILE)
    print(f"  Total IRIS France métro : {len(gdf)}", file=sys.stderr)

    # Filtre Bretagne + 44 (réduit drastiquement le rtree)
    mask = gdf["INSEE_COM"].str.startswith(tuple(depts))
    gdf = gdf[mask].reset_index(drop=True)
    print(f"  Filtrés ({','.join(depts)}) : {len(gdf)}", file=sys.stderr)
    print(f"  Loaded in {time.time()-t0:.1f}s", file=sys.stderr)

    # Build STRtree spatial index
    t0 = time.time()
    geoms = list(gdf.geometry)
    tree = STRtree(geoms)
    # Map geometry index → CODE_IRIS
    iris_codes = gdf["CODE_IRIS"].tolist()
    print(f"  R-tree built in {time.time()-t0:.2f}s", file=sys.stderr)

    # Transformer WGS84 → Lambert93
    transformer = Transformer.from_crs("EPSG:4326", "EPSG:2154", always_xy=True)

    # Count remaining
    dept_filter = "','".join(depts)
    remaining = db_query(
        f"SELECT count(*) AS c FROM brh_dpe_prospects "
        f"WHERE departement IN ('{dept_filter}') "
        f"AND latitude IS NOT NULL AND longitude IS NOT NULL "
        f"AND iris_code IS NULL"
    )[0]["c"]
    print(f"À enrichir : {remaining} DPE", file=sys.stderr)

    if args.dry_run:
        print("Dry-run — exit", file=sys.stderr)
        return 0

    target = args.limit if args.limit > 0 else remaining
    processed = 0
    matched = 0
    not_matched = 0
    started = time.time()

    while processed < target:
        page_size = min(PAGE, target - processed)
        rows = db_query(
            f"SELECT id, latitude::float AS lat, longitude::float AS lon "
            f"FROM brh_dpe_prospects "
            f"WHERE departement IN ('{dept_filter}') "
            f"AND latitude IS NOT NULL AND longitude IS NOT NULL "
            f"AND iris_code IS NULL "
            f"ORDER BY id "
            f"LIMIT {page_size}"
        )
        if not rows:
            break

        # Vectorized reproject + spatial query
        updates: list[tuple[int, str]] = []
        for row in rows:
            try:
                x, y = transformer.transform(row["lon"], row["lat"])
                p = Point(x, y)
                # STRtree.query returns geometry indices that intersect bbox
                cand_idx = tree.query(p)
                # Filtre exact .contains() (bbox query can false positive)
                code = None
                for idx in cand_idx:
                    if geoms[idx].contains(p):
                        code = iris_codes[idx]
                        break
                if code:
                    updates.append((row["id"], code))
                    matched += 1
                else:
                    not_matched += 1
            except Exception as e:
                not_matched += 1

        # Batch UPDATE par chunks
        for i in range(0, len(updates), DB_BATCH):
            chunk = updates[i:i + DB_BATCH]
            # Build VALUES list
            values = ",".join(f"({uid}, '{code}')" for uid, code in chunk)
            sql = f"""
UPDATE brh_dpe_prospects p
SET iris_code = v.iris_code
FROM (VALUES {values}) AS v(id, iris_code)
WHERE p.id = v.id
"""
            db_query(sql)
            time.sleep(DB_SLEEP_S)

        processed += len(rows)
        elapsed = time.time() - started
        rate = processed / elapsed if elapsed else 0
        eta = (target - processed) / rate if rate else 0
        print(
            f"[{processed}/{target}] matched={matched} miss={not_matched} "
            f"({rate:.0f}/s, ETA {eta/60:.1f}min)",
            file=sys.stderr,
        )

    elapsed = time.time() - started
    print(f"\n✅ Terminé : {processed} traités, {matched} IRIS matched "
          f"({matched*100//max(1,processed)}%), {elapsed/60:.1f} min",
          file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
