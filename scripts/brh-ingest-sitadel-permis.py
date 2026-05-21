#!/usr/bin/env python3
"""
brh-ingest-sitadel-permis.py
─────────────────────────────────────────────────
Phase 9 — Ingestion permis de construire Sitadel (data.statistiques)
vers brh_permis_construire Supabase, filtré sur les 5 dépts cibles
(22/29/35/44/56) et années récentes (>= 2018).

DEMANDE PHILIPPE (21/05) : « où ça en est au niveau des permis de
construire ? » — la table brh_permis_construire est à 0 row depuis
l'install. Le téléchargement avait été fait le 14/05 mais l'ingest
n'avait jamais atteint Supabase.

SOURCES (CSV depuis data.statistiques.developpement-durable.gouv.fr) :
  - logements.csv (PC pour logements) — 870 MB / 1.87M lignes
  - locaux.csv (PC pour locaux pro) — 290 MB / 767k lignes
  - demolir.csv (PD permis démolir) — 47 MB / 195k lignes
  - amenager.csv : SKIP (PA pas pertinent BRH)

STRATÉGIE : streaming download via requests + csv.reader, filtre
DEP_CODE + AN_DEPOT, batch INSERT vers Supabase via psycopg.

BUDGET : 0 € (sources publiques).
ETA : ~10-15 min par fichier.
"""
from __future__ import annotations

import argparse
import csv
import io
import json
import os
import sys
import time
from typing import Any

import psycopg
import requests

SUPA_DSN = os.environ["BRH_SUPABASE_DB_URL"]

SITADEL_FILES = {
    "logements": "https://data.statistiques.developpement-durable.gouv.fr/dido/api/v1/datafiles/8b35affb-55fc-4c1f-915b-7750f974446a/csv",
    "locaux": "https://data.statistiques.developpement-durable.gouv.fr/dido/api/v1/datafiles/f8f0700f-806c-40a7-83b1-f21cf507e7c4/csv",
    "demolir": "https://data.statistiques.developpement-durable.gouv.fr/dido/api/v1/datafiles/1a9a2f0c-56fe-4e69-84a7-fbbda2121f02/csv",
}

DEPTS_CIBLES = ("22", "29", "35", "44", "56")
MIN_YEAR = 2018  # 5 ans glissants — signaux travaux récents

# Mapping état_dau code → valeur conforme contrainte CHECK
# CHECK ((decision IS NULL) OR (decision IN ('accorde','refuse','tacite','retire','prorroge','annule')))
ETAT_DAU_LABEL = {
    "5": "tacite",
    "6": "accorde",
    "7": "refuse",
    "9": "retire",
    "10": "annule",
    "11": "prorroge",
}


def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def safe_int(v: Any) -> int | None:
    if v is None or v == "":
        return None
    try:
        return int(float(v))
    except (ValueError, TypeError):
        return None


def safe_date(v: Any) -> str | None:
    if not v or v == "":
        return None
    # Format Sitadel : YYYY-MM-DD ou YYYY-MM
    s = str(v).strip()
    if len(s) >= 10 and s[4] == "-" and s[7] == "-":
        return s[:10]
    if len(s) == 7 and s[4] == "-":
        return s + "-01"
    if len(s) == 4 and s.isdigit():
        return s + "-01-01"
    return None


def map_row(row: dict[str, str]) -> dict[str, Any] | None:
    """Mappe une ligne CSV Sitadel vers brh_permis_construire.

    Gère les variantes de schéma selon le fichier source :
    - logements/locaux : NUM_DAU, TYPE_DAU, ETAT_DAU
    - demolir : NUM_PD, ETAT_PD (TYPE_DAU implicite = 'PD')
    - amenager : NUM_PA, ETAT_PA (TYPE_DAU implicite = 'PA')
    """
    num_dau = row.get("NUM_DAU") or row.get("NUM_PD") or row.get("NUM_PA")
    type_dau = row.get("TYPE_DAU")
    if not type_dau:
        if "NUM_PD" in row:
            type_dau = "PD"
        elif "NUM_PA" in row:
            type_dau = "PA"
    dep_code = row.get("DEP_CODE")
    if not num_dau or not type_dau or dep_code not in DEPTS_CIBLES:
        return None

    an_depot = safe_int(row.get("AN_DEPOT"))
    if an_depot is None or an_depot < MIN_YEAR:
        return None
    # Extraction mois depuis DR_DEPOT (format YYYY-MM-DD)
    dr_depot = row.get("DR_DEPOT") or ""
    mois_depot = safe_int(dr_depot[5:7]) if len(dr_depot) >= 7 and dr_depot[4] == "-" else 1

    etat = row.get("ETAT_DAU") or row.get("ETAT_PD") or row.get("ETAT_PA")
    decision_label = ETAT_DAU_LABEL.get(str(etat).strip()) if etat else None

    adr_num = row.get("ADR_NUM_TER", "").strip()
    adr_voie = row.get("ADR_LIBVOIE_TER", "").strip()
    adr_complete = (adr_num + " " + adr_voie).strip() if (adr_num or adr_voie) else None

    # Garde-fous pour les colonnes CHAR(N) Postgres
    cp_voie = (row.get("ADR_CODPOST_TER") or row.get("CODPOST_DEM") or "").strip()[:5] or None
    if cp_voie and len(cp_voie) != 5:
        cp_voie = None
    insee = (row.get("COMM") or "").strip()[:5] or None
    # parcelle_idu reconstituée : CHAR(14) — format INSEE(5)+section(2)+numero(4) = 11 chars
    # Sitadel donne section + num séparément, on construit insee+section+numéro 0-padded
    sec1 = (row.get("SEC_CADASTRE1") or "").strip().upper()
    num1 = (row.get("NUM_CADASTRE1") or "").strip().lstrip("0")
    if insee and sec1 and num1 and num1.isdigit():
        parcelle = f"{insee}{sec1[:3].zfill(3)}{num1.zfill(4)[:4]}"[:14]
    else:
        parcelle = None

    return {
        "id_permis": f"{dep_code}_{num_dau}",
        "type_permis": type_dau,
        "demandeur_nom": row.get("DENOM_DEM") or None,
        "demandeur_qualite": row.get("CJ_DEM") or None,
        "adresse_complete": adr_complete,
        "commune": row.get("ADR_LOCALITE_TER") or row.get("LOCALITE_DEM") or None,
        "code_postal": cp_voie,
        "departement": dep_code,
        "code_insee_commune": insee,
        "parcelle_idu": parcelle,
        "lat": None,  # Sitadel ne fournit pas lat/lng
        "lng": None,
        "surface_terrain_m2": safe_int(row.get("SUPERFICIE_TERRAIN")),
        "surface_plancher_m2": safe_int(row.get("SURF_HAB_CREEE")),
        "destination": row.get("DESTINATION_PRINCIPALE") or None,
        "nature_travaux": row.get("NATURE_PROJET_DECLAREE") or row.get("NATURE_PROJET_COMPLETEE") or None,
        "nombre_logements_crees": safe_int(row.get("NB_LGT_TOT_CREES")),
        "date_depot": safe_date(row.get("DR_DEPOT")) or f"{an_depot}-{(mois_depot or 1):02d}-01",
        "date_decision": safe_date(row.get("DATE_REELLE_AUTORISATION")),
        "decision": decision_label,
        "date_dob": row.get("DATE_REELLE_DOC") or None,
        "date_daact": row.get("DATE_REELLE_DAACT") or None,
        "date_validite_max": None,
        "source_year": an_depot,
        "source_month": mois_depot or 1,
        "raw_record": json.dumps({k: v for k, v in row.items() if v}),
    }


INSERT_SQL = """
INSERT INTO public.brh_permis_construire (
  id_permis, type_permis, demandeur_nom, demandeur_qualite,
  adresse_complete, commune, code_postal, departement, code_insee_commune,
  parcelle_idu, lat, lng,
  surface_terrain_m2, surface_plancher_m2, destination, nature_travaux,
  nombre_logements_crees, date_depot, date_decision, decision,
  date_dob, date_daact, date_validite_max,
  source_year, source_month, raw_record
) VALUES (
  %(id_permis)s, %(type_permis)s, %(demandeur_nom)s, %(demandeur_qualite)s,
  %(adresse_complete)s, %(commune)s, %(code_postal)s, %(departement)s, %(code_insee_commune)s,
  %(parcelle_idu)s, %(lat)s, %(lng)s,
  %(surface_terrain_m2)s, %(surface_plancher_m2)s, %(destination)s, %(nature_travaux)s,
  %(nombre_logements_crees)s, %(date_depot)s, %(date_decision)s, %(decision)s,
  %(date_dob)s, %(date_daact)s, %(date_validite_max)s,
  %(source_year)s, %(source_month)s, %(raw_record)s::jsonb
)
ON CONFLICT (id_permis) DO NOTHING;
"""


def stream_csv(url: str):
    """Stream un CSV depuis URL ligne par ligne (gestion mémoire constante)."""
    with requests.get(url, stream=True, timeout=600) as r:
        r.raise_for_status()
        # Le CSV Sitadel est en latin-1, séparateur ;
        text_iter = io.TextIOWrapper(r.raw, encoding="latin-1", newline="")
        reader = csv.DictReader(text_iter, delimiter=";")
        for row in reader:
            yield row


def ingest_file(conn, label: str, url: str, batch_size: int = 1000) -> dict:
    log(f"━━━━ {label} ━━━━ download depuis {url[:80]}...")
    stats = {"in": 0, "filtered": 0, "inserted": 0, "errors": 0}
    batch = []
    t0 = time.time()

    for row in stream_csv(url):
        stats["in"] += 1
        mapped = map_row(row)
        if not mapped:
            continue
        stats["filtered"] += 1
        batch.append(mapped)

        if len(batch) >= batch_size:
            try:
                with conn.cursor() as cur:
                    cur.executemany(INSERT_SQL, batch)
                stats["inserted"] += len(batch)
                conn.commit()
            except Exception as e:
                stats["errors"] += 1
                conn.rollback()
                log(f"  insert err : {str(e)[:200]}")
            batch = []

        if stats["in"] % 100000 == 0:
            log(f"  in={stats['in']} filtered={stats['filtered']} inserted={stats['inserted']}")

    # Flush dernier batch
    if batch:
        try:
            with conn.cursor() as cur:
                cur.executemany(INSERT_SQL, batch)
            stats["inserted"] += len(batch)
            conn.commit()
        except Exception as e:
            stats["errors"] += 1
            conn.rollback()
            log(f"  flush err : {str(e)[:200]}")

    elapsed = time.time() - t0
    log(f"  {label} terminé : in={stats['in']} filtered={stats['filtered']} inserted={stats['inserted']} en {elapsed:.0f}s")
    return stats


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", choices=list(SITADEL_FILES.keys()), help="Fichier unique (sinon tous)")
    args = parser.parse_args()

    files = {args.file: SITADEL_FILES[args.file]} if args.file else SITADEL_FILES

    t0 = time.time()
    log("Connexion DB...")
    conn = psycopg.connect(SUPA_DSN, autocommit=False)

    total = {"in": 0, "filtered": 0, "inserted": 0}
    for label, url in files.items():
        s = ingest_file(conn, label, url)
        for k in total:
            total[k] += s[k]

    conn.close()
    log("")
    log("═══════════════ TOTAUX ═══════════════")
    log(f"  Lignes lues       : {total['in']:,}")
    log(f"  Filtrées 5 dépts  : {total['filtered']:,}")
    log(f"  Insérées          : {total['inserted']:,}")
    log(f"  Durée totale      : {time.time()-t0:.0f}s")


if __name__ == "__main__":
    main()
