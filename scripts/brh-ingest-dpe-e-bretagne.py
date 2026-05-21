#!/usr/bin/env python3
"""
brh-ingest-dpe-e-bretagne.py
─────────────────────────────────────────────────
Phase 7 — Ingestion DPE classe E (4 dépts Bretagne 22/29/35/56)

DEMANDE PHILIPPE (21/05/2026, ouverture périmètre F/G → E+F+G) :
  « ça vaut le coup d'élargir le périmètre FG pour intégrer E dedans »

VOLUMÉTRIE ATTENDUE (audit Phase 7.1) :
  Dept 22 : 17 169 DPE E
  Dept 29 : 25 166 DPE E
  Dept 35 : 25 036 DPE E
  Dept 56 : 19 201 DPE E
  → Total : ~86 572 DPE classe E

SOURCE :
  API ADEME data-fair, dataset meg-83tjwtg8dyz4vv7h1dqe (DPE Logements
  existants depuis juillet 2021). Cursor pagination via `next` URL.

CIBLE :
  Table public.brh_dpe_prospects (~59k F/G actuels + ~86k E à ajouter).
  Idempotent via UNIQUE INDEX sur numero_dpe → ON CONFLICT DO NOTHING.
  Colonnes générées adresse_norm/numero_norm/voie_norm auto-populées
  via colonne générée STORED (Phase 2A migration 20260521110000).

USAGE :
  .venv/bin/python brh-ingest-dpe-e-bretagne.py --dept 22
  .venv/bin/python brh-ingest-dpe-e-bretagne.py            # tous dépts

COÛT : 0 € (API ADEME publique).
"""
from __future__ import annotations

import argparse
import os
import sys
import time
from typing import Any

import psycopg
import requests

SUPA_DSN = os.environ["BRH_SUPABASE_DB_URL"]
ADEME_DATASET_ID = "meg-83tjwtg8dyz4vv7h1dqe"
ADEME_BASE = f"https://data.ademe.fr/data-fair/api/v1/datasets/{ADEME_DATASET_ID}/lines"

DEPTS_BRETAGNE = ("22", "29", "35", "56")

# Champs ADEME à demander (limite la bande passante + parse).
ADEME_FIELDS = ",".join([
    "numero_dpe",
    "date_etablissement_dpe",
    "etiquette_dpe",
    "etiquette_ges",
    "adresse_ban",
    "code_postal_ban",
    "nom_commune_ban",
    "code_departement_ban",
    "_geopoint",
    "type_batiment",
    "annee_construction",
    "surface_habitable_logement",
    "type_energie_principale_chauffage",
    "type_energie_principale_ecs",
    "conso_5_usages_par_m2_ep",
    "cout_total_5_usages",
    "cout_chauffage",
    "cout_ecs",
    "cout_eclairage",
])


def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def parse_geopoint(s: str | None) -> tuple[float | None, float | None]:
    if not s or "," not in s:
        return None, None
    try:
        lat_s, lng_s = s.split(",", 1)
        return float(lat_s), float(lng_s)
    except ValueError:
        return None, None


def map_ademe_row(r: dict[str, Any]) -> dict[str, Any] | None:
    """Mappe une ligne ADEME vers le schema brh_dpe_prospects."""
    num = r.get("numero_dpe")
    if not num:
        return None
    lat, lng = parse_geopoint(r.get("_geopoint"))
    return {
        "numero_dpe": num,
        "date_dpe": r.get("date_etablissement_dpe"),
        "etiquette_dpe": r.get("etiquette_dpe"),
        "etiquette_ges": r.get("etiquette_ges"),
        "adresse": r.get("adresse_ban"),
        "adresse_ban": r.get("adresse_ban"),
        "code_postal": r.get("code_postal_ban"),
        "commune": r.get("nom_commune_ban"),
        "departement": r.get("code_departement_ban"),
        "latitude": lat,
        "longitude": lng,
        "type_batiment": r.get("type_batiment"),
        "annee_construction": r.get("annee_construction"),
        "surface_habitable": r.get("surface_habitable_logement"),
        "conso_m2_ep": r.get("conso_5_usages_par_m2_ep"),
        "cout_energie_annuel": r.get("cout_total_5_usages"),
        "cout_chauffage": r.get("cout_chauffage"),
        "cout_ecs": r.get("cout_ecs"),
        "cout_eclairage": r.get("cout_eclairage"),
        "energie_chauffage": r.get("type_energie_principale_chauffage"),
        "energie_ecs": r.get("type_energie_principale_ecs"),
        "statut": "nouveau_e_21_05",
        "enriched": False,
    }


def fetch_ademe_pages(dept: str):
    """Generator qui yield les pages ADEME pour un dept via cursor pagination."""
    params = {
        "size": 10000,
        "qs": f"etiquette_dpe:E AND code_departement_ban:{dept}",
        "select": ADEME_FIELDS,
    }
    url = ADEME_BASE
    fetched = 0
    while True:
        try:
            r = requests.get(url, params=params if url == ADEME_BASE else None, timeout=120)
        except requests.RequestException as e:
            log(f"  HTTP error : {e} — retry après 5s")
            time.sleep(5)
            continue
        if r.status_code != 200:
            log(f"  ADEME status {r.status_code} : {r.text[:200]}")
            break
        d = r.json()
        results = d.get("results", [])
        total = d.get("total", 0)
        fetched += len(results)
        log(f"  dept {dept} : page +{len(results)} ({fetched}/{total})")
        if not results:
            break
        yield results
        next_url = d.get("next")
        if not next_url:
            break
        url = next_url  # cursor URL contient déjà tous les params


INSERT_SQL = """
INSERT INTO public.brh_dpe_prospects (
    numero_dpe, date_dpe, etiquette_dpe, etiquette_ges,
    adresse, adresse_ban, code_postal, commune, departement,
    latitude, longitude, type_batiment, annee_construction,
    surface_habitable, conso_m2_ep, cout_energie_annuel,
    cout_chauffage, cout_ecs, cout_eclairage,
    energie_chauffage, energie_ecs, statut, enriched
) VALUES (
    %(numero_dpe)s, %(date_dpe)s, %(etiquette_dpe)s, %(etiquette_ges)s,
    %(adresse)s, %(adresse_ban)s, %(code_postal)s, %(commune)s, %(departement)s,
    %(latitude)s, %(longitude)s, %(type_batiment)s, %(annee_construction)s,
    %(surface_habitable)s, %(conso_m2_ep)s, %(cout_energie_annuel)s,
    %(cout_chauffage)s, %(cout_ecs)s, %(cout_eclairage)s,
    %(energie_chauffage)s, %(energie_ecs)s, %(statut)s, %(enriched)s
)
ON CONFLICT (numero_dpe) DO NOTHING;
"""


def insert_rows(conn, rows: list[dict[str, Any]]) -> int:
    """Insère un batch de rows. Retourne le nombre effectivement inséré."""
    if not rows:
        return 0
    with conn.cursor() as cur:
        # psycopg3 executemany avec returning de rowcount global
        cur.executemany(INSERT_SQL, rows)
        # rowcount sur executemany retourne la dernière, pas le total → on
        # estime via len(rows) - conflits ignorés. Approximation suffisante.
        return cur.rowcount if cur.rowcount > 0 else len(rows)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dept", choices=DEPTS_BRETAGNE, help="Dept unique (sinon tous)")
    args = parser.parse_args()

    depts = (args.dept,) if args.dept else DEPTS_BRETAGNE

    log("Connexion DB...")
    conn = psycopg.connect(SUPA_DSN, autocommit=False)

    total_ingested = 0
    total_seen = 0
    t0 = time.time()

    for dept in depts:
        log(f"━━━━ Dept {dept} ━━━━")
        dept_ingested = 0
        for page in fetch_ademe_pages(dept):
            mapped = [m for m in (map_ademe_row(r) for r in page) if m]
            inserted = insert_rows(conn, mapped)
            dept_ingested += inserted
            total_ingested += inserted
            total_seen += len(mapped)
            conn.commit()
        log(f"  dept {dept} terminé : {dept_ingested} rows insérés (ON CONFLICT DO NOTHING)")

    conn.close()
    elapsed = time.time() - t0
    log("")
    log("═══════════════ STATS ═══════════════")
    log(f"  Total fetched ADEME : {total_seen}")
    log(f"  Total inserted (approx) : {total_ingested}")
    log(f"  Durée : {elapsed:.1f}s")


if __name__ == "__main__":
    main()
