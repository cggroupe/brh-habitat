#!/usr/bin/env python3
"""
Seed brh_ext_dgfip_centres avec les centres SIP/SIE/CDIF de Bretagne (5 dépts).

Source : API service-public.fr lannuaire
  https://api-lannuaire.service-public.fr/api/explore/v2.1/catalog/datasets/api-lannuaire-administration/records

Idempotent : ON CONFLICT (id) DO UPDATE.
Usage :
  python3 scripts/brh-seed-dgfip-centres.py [--depts=22,29,35,44,56]
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path
from urllib.parse import urlencode
import urllib.request

import psycopg2
from psycopg2.extras import execute_values

API = "https://api-lannuaire.service-public.fr/api/explore/v2.1/catalog/datasets/api-lannuaire-administration/records"
DEFAULT_DEPTS = ["22", "29", "35", "44", "56"]
PAGE_LIMIT = 100


def load_db_url() -> str:
    for line in Path("/opt/stack/.env").read_text().splitlines():
        if line.startswith("BRH_SUPABASE_DB_URL="):
            return line.split("=", 1)[1].strip().strip("\"'")
    raise RuntimeError("BRH_SUPABASE_DB_URL missing")


def fetch_dept(dept: str) -> list[dict]:
    """Fetch tous les SIP/SIE/CDIF pour un département."""
    out: list[dict] = []
    offset = 0
    while True:
        # Filtre par dept : code postal commence par dept
        params = {
            "where": f"(pivot like '%sip%' OR pivot like '%sie%' OR pivot like '%cdif%') AND code_postal like '{dept}%'",
            "limit": PAGE_LIMIT,
            "offset": offset,
        }
        url = f"{API}?{urlencode(params)}"
        try:
            with urllib.request.urlopen(url, timeout=20) as r:
                data = json.loads(r.read().decode("utf-8"))
        except Exception as e:
            print(f"  Error dept {dept} offset {offset}: {e}", file=sys.stderr)
            break
        results = data.get("results", [])
        if not results:
            break
        out.extend(results)
        if len(results) < PAGE_LIMIT:
            break
        offset += PAGE_LIMIT
        time.sleep(0.2)
    return out


def transform(rec: dict) -> dict | None:
    nom = rec.get("nom") or ""
    if not nom:
        return None
    # Determine type from pivot JSON
    pivot_raw = rec.get("pivot")
    type_centre = "AUTRE"
    if isinstance(pivot_raw, str):
        try:
            pivot_arr = json.loads(pivot_raw)
            if pivot_arr and isinstance(pivot_arr, list):
                t = pivot_arr[0].get("type_service_local", "").upper()
                if t in ("SIP", "SIE", "CDIF"):
                    type_centre = t
        except Exception:
            pass
    # Adresse — premier élément du tableau adresse
    adr_raw = rec.get("adresse")
    adresse_str = None
    cp = None
    commune = None
    lat = None
    lng = None
    if isinstance(adr_raw, str):
        try:
            adr_arr = json.loads(adr_raw)
            if adr_arr and isinstance(adr_arr, list):
                a = adr_arr[0]
                num = a.get("numero_voie", "") or ""
                nv = a.get("nom_voie", "") or ""
                comp = a.get("complement1", "") or a.get("complement2", "") or ""
                adresse_str = f"{num} {nv} {comp}".strip().replace("  ", " ")[:250]
                cp = (a.get("code_postal") or "")[:5] or None
                commune = (a.get("nom_commune") or "")[:120] or None
                if a.get("latitude") and a.get("longitude"):
                    try:
                        lat = float(a["latitude"])
                        lng = float(a["longitude"])
                    except Exception:
                        pass
        except Exception:
            pass
    tel = None
    tel_raw = rec.get("telephone")
    if isinstance(tel_raw, str):
        try:
            tel_arr = json.loads(tel_raw)
            if tel_arr and isinstance(tel_arr, list):
                tel = (tel_arr[0].get("valeur") or "")[:50]
        except Exception:
            pass
    return {
        "id": rec.get("id"),
        "nom": nom[:250],
        "type_centre": type_centre,
        "adresse": adresse_str,
        "code_postal": cp,
        "commune": commune,
        "departement": cp[:2] if cp else None,
        "telephone": tel,
        "lat": lat,
        "lng": lng,
    }


def insert_rows(conn, rows: list[dict]):
    if not rows:
        return 0
    cur = conn.cursor()
    cols = ["id", "nom", "type_centre", "adresse", "code_postal", "commune", "departement", "telephone", "lat", "lng"]
    sql = f"""
        INSERT INTO brh_ext_dgfip_centres ({", ".join(cols)})
        VALUES %s
        ON CONFLICT (id) DO UPDATE SET
          nom = EXCLUDED.nom,
          adresse = EXCLUDED.adresse,
          code_postal = EXCLUDED.code_postal,
          commune = EXCLUDED.commune,
          telephone = EXCLUDED.telephone,
          lat = EXCLUDED.lat,
          lng = EXCLUDED.lng,
          updated_at = NOW()
    """
    values = [tuple(r.get(c) for c in cols) for r in rows]
    execute_values(cur, sql, values, page_size=200)
    conn.commit()
    n = cur.rowcount
    cur.close()
    return n


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--depts", default=",".join(DEFAULT_DEPTS))
    args = ap.parse_args()
    depts = [d.strip() for d in args.depts.split(",") if d.strip()]
    conn = psycopg2.connect(load_db_url())
    total_in = 0
    for d in depts:
        recs = fetch_dept(d)
        rows = [r for r in (transform(x) for x in recs) if r is not None]
        n = insert_rows(conn, rows)
        print(f"dept {d}: {len(recs)} fetched · {len(rows)} valides · {n} upserts")
        total_in += n
    print(f"Total : {total_in}")
    conn.close()


if __name__ == "__main__":
    main()
