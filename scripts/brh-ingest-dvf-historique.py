#!/usr/bin/env python3
"""
brh-ingest-dvf-historique.py
─────────────────────────────────────
Phase nocturne 21/05 — Ingest DVF historique 2020-2023.

CONTEXTE :
  brh_dvf_archive contient déjà 10 ans glissants mais les fichiers CSV
  historiques 2020-2023 sont sur disque non ingérés. Élargit la fenêtre
  acquéreur 24m → 60m pour le score travaux.

SOURCE :
  /opt/stack/sci-immobilier/data/dvf_{2020..2023}.csv.gz

CIBLE :
  Table public.brh_dvf_archive (104 225 → ~300k rows attendu).
  Idempotent : UNIQUE INDEX sur id_mutation.

FILTRES :
  - departement IN (22, 29, 35, 44, 56)
  - nature_mutation = 'Vente'
  - type_local IN ('Maison', 'Appartement')
"""
from __future__ import annotations

import csv
import gzip
import os
import sys
import time

import psycopg

SUPA_DSN = os.environ["BRH_SUPABASE_DB_URL"]
DVF_DIR = "/opt/stack/sci-immobilier/data"
YEARS = (2020, 2021, 2022, 2023)
DEPTS_CIBLES = ("22", "29", "35", "44", "56")


def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def safe_int(v) -> int | None:
    if v is None or v == "" or v == "Non communiqué":
        return None
    try:
        return int(float(str(v).replace(",", ".")))
    except (ValueError, TypeError):
        return None


def safe_float(v) -> float | None:
    if v is None or v == "":
        return None
    try:
        return float(str(v).replace(",", "."))
    except (ValueError, TypeError):
        return None


def map_row(r: dict, source_year: int) -> dict | None:
    """Mappe DVF row → brh_dvf_archive (format data.gouv DVF+)."""
    cp = (r.get("code_postal") or "").strip().zfill(5)
    if len(cp) != 5 or cp[:2] not in DEPTS_CIBLES:
        return None

    nature = (r.get("nature_mutation") or "").strip()
    if nature != "Vente":
        return None

    type_local = (r.get("type_local") or "").strip()
    if type_local not in ("Maison", "Appartement"):
        return None

    valeur = safe_float(r.get("valeur_fonciere"))
    if not valeur or valeur <= 0:
        return None

    surface = safe_int(r.get("surface_reelle_bati"))
    prix_m2 = int(valeur / surface) if surface and surface > 0 else None

    return {
        "id_mutation": r.get("id_mutation"),
        "date_mutation": (r.get("date_mutation") or "").strip() or None,
        "nature_mutation": nature,
        "valeur_fonciere_cents": int(valeur * 100),
        "code_postal": cp,
        "commune": r.get("nom_commune"),
        "code_insee_commune": r.get("code_commune"),
        "departement": cp[:2],
        "adresse_numero": (r.get("adresse_numero") or "").strip(),
        "adresse_voie": (r.get("adresse_nom_voie") or "").strip(),
        "type_local": type_local,
        "surface_reelle_bati": surface,
        "nombre_pieces_principales": safe_int(r.get("nombre_pieces_principales")),
        "surface_terrain": safe_int(r.get("surface_terrain")),
        "parcelle_idu": (r.get("id_parcelle") or "")[:14] or None,
        "lat": safe_float(r.get("latitude")),
        "lng": safe_float(r.get("longitude")),
        "prix_m2_calc": prix_m2,
        "is_groupee": surface is None or surface == 0,
        "usable_for_brh": surface is not None and surface > 0,
        "source_year": source_year,
    }


INSERT_SQL = """
INSERT INTO public.brh_dvf_archive (
  id_mutation, date_mutation, nature_mutation, valeur_fonciere_cents,
  code_postal, commune, code_insee_commune, departement,
  adresse_numero, adresse_voie, type_local, surface_reelle_bati,
  nombre_pieces_principales, surface_terrain, parcelle_idu, lat, lng,
  prix_m2_calc, is_groupee, usable_for_brh, source_year
) VALUES (
  %(id_mutation)s, %(date_mutation)s, %(nature_mutation)s, %(valeur_fonciere_cents)s,
  %(code_postal)s, %(commune)s, %(code_insee_commune)s, %(departement)s,
  %(adresse_numero)s, %(adresse_voie)s, %(type_local)s, %(surface_reelle_bati)s,
  %(nombre_pieces_principales)s, %(surface_terrain)s, %(parcelle_idu)s, %(lat)s, %(lng)s,
  %(prix_m2_calc)s, %(is_groupee)s, %(usable_for_brh)s, %(source_year)s
)
ON CONFLICT (id_mutation) DO NOTHING;
"""


def ingest_year(conn, year: int) -> int:
    path = f"{DVF_DIR}/dvf_{year}.csv.gz"
    if not os.path.exists(path):
        log(f"  ⚠️  {path} introuvable, skip")
        return 0

    log(f"━━━━ {year} : ingest {path} ━━━━")
    inserted = 0
    batch = []
    t0 = time.time()
    with gzip.open(path, "rt", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter=",")
        for i, row in enumerate(reader):
            mapped = map_row(row, year)
            if not mapped:
                continue
            batch.append(mapped)
            if len(batch) >= 500:
                try:
                    with conn.cursor() as cur:
                        cur.executemany(INSERT_SQL, batch)
                    inserted += len(batch)
                    conn.commit()
                except Exception as e:
                    conn.rollback()
                    log(f"  batch err: {str(e)[:200]}")
                batch = []
            if (i + 1) % 100000 == 0:
                log(f"  lu {i+1:,} lignes, inséré {inserted:,}")

    if batch:
        try:
            with conn.cursor() as cur:
                cur.executemany(INSERT_SQL, batch)
            inserted += len(batch)
            conn.commit()
        except Exception as e:
            conn.rollback()
            log(f"  flush err: {str(e)[:200]}")

    log(f"  {year} terminé : {inserted:,} insérés (ou skipped via ON CONFLICT) en {time.time()-t0:.0f}s")
    return inserted


def main():
    t0 = time.time()
    log("Connexion DB...")
    conn = psycopg.connect(SUPA_DSN, autocommit=False)

    total = 0
    for year in YEARS:
        total += ingest_year(conn, year)
        time.sleep(5)  # respiration pool

    conn.close()
    log("")
    log(f"═══ TOTAL : {total:,} mutations DVF 2020-2023 ingérées en {time.time()-t0:.0f}s ═══")


if __name__ == "__main__":
    main()
