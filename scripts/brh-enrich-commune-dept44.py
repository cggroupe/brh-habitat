#!/usr/bin/env python3
"""
brh-enrich-commune-dept44.py
─────────────────────────────────────
Phase 24/05 — Compléter brh_ext_commune pour les 207 communes du dept 44.

CONTEXTE :
  Seed initial (seed-commune-bretagne.ts --dept=44) n'a rempli que 16/63 cols
  (Géorisques + RGE ADEME). Les 47 autres sont NULL → score V2 plafonne à ~25
  pour 38k DPE E du 44.

MODULES (exécutés en série pour ne pas saturer la DB):
  1. internal_dvf       : prix_m2_median_3y, prix_m2_growth_3y (depuis brh_dvf_archive)
  2. internal_sitadel   : nb_dp_logements_existants_12m (depuis brh_permis_construire)
  3. internal_dpe_ademe : audits_ademe_count (depuis brh_dpe_prospects E)
  4. insee_population   : population_2022 (geo.api.gouv.fr)
  5. georisques         : catnat_total/inondation/tempete/secheresse/last_date,
                          basias_count, basol_count, icpe_count, abf_ac1_count
  6. lovac              : lovac_pp_total_2024, vacant_2024, vacant_2ans_2024,
                          tx_vacance, tx_vacance_long (data.gouv LOVAC CSV)
  7. tlv                : tlv_tendue, tlv_zonage (data.gouv décret 22/12/2025 CSV)
  8. sru                : sru_assujettie, sru_deficitaire, sru_carencee,
                          sru_taux_lls (data.gouv SRU 2025 CSV)
  9. merimee            : merimee_count, merimee_classe, merimee_inscrit
                          (Mérimée POP CSV)

LIMITATIONS ASSUMÉES (laissées NULL):
  - population_2008 / population_2016 → pas dispo via API publique simple
  - evolution_pop_16_22 → idem
  - dju_18_normal / station_dju_id / delta_dju_2050 / tracc_climat → Météo-France
  - taux_tfb/tfnb/th/teom → DGFiP (CSV par dépt, non couvert ici)
  - opah_active/operateur/fin_validite → ANIL scraping
  - znieff*/natura2000* → INPN MNHN bulk
  - rnb_batiments_count → RNB data.gouv volumineux
  - lignes_ht_count → RTE
  - tx_vacance_struct → présent via LOVAC mais col legacy

USAGE :
  set -a && source /opt/stack/.env && set +a
  python3 scripts/brh-enrich-commune-dept44.py [--dry-run] [--only=MODULE1,MODULE2]
"""
from __future__ import annotations

import csv
import os
import re
import sys
import time
from collections import defaultdict
from datetime import datetime
from typing import Any, Optional

import psycopg
import requests

# ============================================================================
# Config
# ============================================================================
SUPA_DSN = os.environ.get("BRH_SUPABASE_DB_URL", "")
DEPT = "44"
DATA_DIR = "/tmp/brh-44-enrich/data"
THROTTLE_API_MS = 200  # 5 req/s pour API publiques (Géorisques)
SLEEP_BATCH_DB = 0.3   # entre UPDATEs lourds

GR_API = "https://georisques.gouv.fr/api/v1"
GEO_API = "https://geo.api.gouv.fr"

LOVAC_URL = "https://static.data.gouv.fr/resources/logements-vacants-du-parc-prive-lovac-par-commune-departement-region-et-france/20250528-090420/lovac-opendata-communes.csv"
SRU_URL = "https://static.data.gouv.fr/resources/communes-et-inventaire-sru/20251219-143258/donnees-sru-data-gouv-2025-v2.csv"
TLV_URL = "https://static.data.gouv.fr/resources/liste-des-communes-selon-le-zonage-tlv-1/20251230-094759/zonage-tlv-decret-22-dec-2025.csv"
MERIMEE_URL = "https://object.data.gouv.fr/ministere-culture/POP/merimee.csv"
FISCALITE_URL = (
    "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/"
    "fiscalite-locale-des-particuliers/records"
)

if not SUPA_DSN:
    print("ERROR: BRH_SUPABASE_DB_URL not set", file=sys.stderr)
    sys.exit(1)


def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def sleep_ms(ms: int) -> None:
    time.sleep(ms / 1000)


# ============================================================================
# Helpers DB
# ============================================================================
def fetch_communes_44(conn) -> list[str]:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT insee FROM brh_ext_commune WHERE insee LIKE '44%' ORDER BY insee"
        )
        return [r[0] for r in cur.fetchall()]


def bulk_update(conn, table: str, key_col: str, updates: list[dict]) -> int:
    """UPDATE par lots de 50 rows via UNNEST.
    updates: list of {key_col: '44109', col1: val1, col2: val2}
    """
    if not updates:
        return 0
    cols = [c for c in updates[0].keys() if c != key_col]
    if not cols:
        return 0
    total = 0
    BATCH = 50
    for i in range(0, len(updates), BATCH):
        batch = updates[i : i + BATCH]
        with conn.cursor() as cur:
            # Build VALUES clause
            placeholders = []
            params: list[Any] = []
            for row in batch:
                ph = "(" + ",".join(["%s"] * (len(cols) + 1)) + ")"
                placeholders.append(ph)
                params.append(row[key_col])
                for c in cols:
                    params.append(row.get(c))
            set_clause = ",".join([f"{c}=v.{c}" for c in cols])
            sql = f"""
                UPDATE {table} AS t
                SET {set_clause}
                FROM (VALUES {','.join(placeholders)}) AS v({key_col},{','.join(cols)})
                WHERE t.{key_col} = v.{key_col}
            """
            cur.execute(sql, params)
            total += cur.rowcount
        conn.commit()
        time.sleep(SLEEP_BATCH_DB)
    return total


# ============================================================================
# MODULE 1: DVF interne (prix_m2_median_3y, prix_m2_growth_3y)
# ============================================================================
def module_internal_dvf(conn, communes: list[str], dry: bool) -> dict:
    log("→ MODULE 1: DVF interne (prix_m2_median_3y + prix_m2_growth_3y)")
    with conn.cursor() as cur:
        # Median 3 dernières années + growth (year-2 vs year-0)
        cur.execute(
            """
            WITH dvf_44 AS (
                SELECT
                    code_insee_commune,
                    EXTRACT(YEAR FROM date_mutation)::int AS yr,
                    prix_m2_calc::numeric AS pm2
                FROM brh_dvf_archive
                WHERE departement = '44'
                  AND usable_for_brh = TRUE
                  AND prix_m2_calc IS NOT NULL
                  AND prix_m2_calc BETWEEN 200 AND 20000
                  AND date_mutation >= '2022-01-01'
            ),
            med_3y AS (
                SELECT code_insee_commune,
                       PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY pm2) AS median_3y
                FROM dvf_44
                GROUP BY code_insee_commune
                HAVING COUNT(*) >= 5
            ),
            med_by_year AS (
                SELECT code_insee_commune, yr,
                       PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY pm2) AS med
                FROM dvf_44
                GROUP BY code_insee_commune, yr
                HAVING COUNT(*) >= 3
            ),
            growth AS (
                SELECT
                    a.code_insee_commune,
                    (a.med - b.med) / NULLIF(b.med, 0) AS growth_3y
                FROM med_by_year a
                JOIN med_by_year b
                  ON a.code_insee_commune = b.code_insee_commune
                 AND a.yr = (SELECT MAX(yr) FROM med_by_year x WHERE x.code_insee_commune=a.code_insee_commune)
                 AND b.yr = (SELECT MIN(yr) FROM med_by_year x WHERE x.code_insee_commune=b.code_insee_commune AND x.yr >= EXTRACT(YEAR FROM CURRENT_DATE) - 3)
                WHERE a.yr <> b.yr
            )
            SELECT m.code_insee_commune, m.median_3y, g.growth_3y
            FROM med_3y m
            LEFT JOIN growth g ON g.code_insee_commune = m.code_insee_commune
            """
        )
        rows = cur.fetchall()

    updates = []
    for insee, med, growth in rows:
        if insee and insee.startswith("44"):
            updates.append(
                {
                    "insee": insee,
                    "prix_m2_median_3y": round(float(med), 2) if med else None,
                    "prix_m2_growth_3y": (
                        round(float(growth), 4) if growth is not None else None
                    ),
                    "dvf_last_refresh": datetime.utcnow(),
                }
            )
    log(f"   {len(updates)} communes 44 avec données DVF")
    if dry:
        return {"updates": len(updates), "module": "internal_dvf"}
    n = bulk_update(conn, "brh_ext_commune", "insee", updates)
    log(f"   ✅ {n} UPDATE")
    return {"updated": n, "module": "internal_dvf"}


# ============================================================================
# MODULE 2: Sitadel interne (nb_dp_logements_existants_12m)
# ============================================================================
def module_internal_sitadel(conn, communes: list[str], dry: bool) -> dict:
    log("→ MODULE 2: Sitadel interne (nb_dp_logements_existants_12m)")
    with conn.cursor() as cur:
        # DP (déclaration préalable) sur logements existants, 12 derniers mois
        # type_permis='DP' + nature_travaux NOT LIKE construction neuve
        cur.execute(
            """
            SELECT
                code_insee_commune,
                COUNT(*) AS nb_dp
            FROM brh_permis_construire
            WHERE departement = '44'
              AND type_permis = 'DP'
              AND date_depot >= (CURRENT_DATE - INTERVAL '12 months')
            GROUP BY code_insee_commune
            """
        )
        rows = cur.fetchall()

    updates = []
    for insee, nb in rows:
        if insee and insee.startswith("44"):
            updates.append(
                {
                    "insee": insee,
                    "nb_dp_logements_existants_12m": int(nb),
                    "sitadel2_last_refresh": datetime.utcnow(),
                }
            )
    log(f"   {len(updates)} communes 44 avec DP sur 12m")
    if dry:
        return {"updates": len(updates), "module": "internal_sitadel"}
    n = bulk_update(conn, "brh_ext_commune", "insee", updates)
    # Combler les 0 pour les communes sans DP
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE brh_ext_commune
            SET nb_dp_logements_existants_12m = 0,
                sitadel2_last_refresh = NOW()
            WHERE insee LIKE '44%' AND nb_dp_logements_existants_12m IS NULL
            """
        )
        zeros = cur.rowcount
    conn.commit()
    log(f"   ✅ {n} UPDATE + {zeros} mises à zéro")
    return {"updated": n, "zeros": zeros, "module": "internal_sitadel"}


# ============================================================================
# MODULE 3: DPE ADEME interne (audits_ademe_count)
# ============================================================================
def module_internal_dpe_ademe(conn, communes: list[str], dry: bool) -> dict:
    log("→ MODULE 3: DPE ADEME interne (audits_ademe_count)")
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT code_insee, COUNT(*) AS cnt
            FROM brh_dpe_prospects
            WHERE departement = '44'
              AND code_insee IS NOT NULL
            GROUP BY code_insee
            """
        )
        rows = cur.fetchall()

    updates = []
    for insee, cnt in rows:
        if insee and insee.startswith("44"):
            updates.append(
                {"insee": insee, "audits_ademe_count": int(cnt)}
            )
    log(f"   {len(updates)} communes 44 avec audits DPE")
    if dry:
        return {"updates": len(updates), "module": "internal_dpe_ademe"}
    n = bulk_update(conn, "brh_ext_commune", "insee", updates)
    # Mettre à zéro les communes sans audit
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE brh_ext_commune SET audits_ademe_count = 0 "
            "WHERE insee LIKE '44%' AND audits_ademe_count IS NULL"
        )
        zeros = cur.rowcount
    conn.commit()
    log(f"   ✅ {n} UPDATE + {zeros} mises à zéro")
    return {"updated": n, "zeros": zeros, "module": "internal_dpe_ademe"}


# ============================================================================
# MODULE 4: INSEE Population (geo.api.gouv.fr)
# ============================================================================
def module_insee_population(conn, communes: list[str], dry: bool) -> dict:
    log("→ MODULE 4: INSEE Population (geo.api.gouv.fr — pop courante seulement)")
    updates = []
    sess = requests.Session()
    sess.headers["User-Agent"] = "brh-habitat-enrich/1.0"
    for i, insee in enumerate(communes):
        try:
            r = sess.get(
                f"{GEO_API}/communes/{insee}?fields=population",
                timeout=10,
            )
            if r.status_code == 200:
                pop = r.json().get("population")
                if pop:
                    updates.append({"insee": insee, "population_2022": int(pop)})
            sleep_ms(THROTTLE_API_MS)
        except Exception as e:
            log(f"   ⚠ {insee}: {e}")
        if (i + 1) % 50 == 0:
            log(f"   {i + 1}/{len(communes)} fetched")
    log(f"   {len(updates)} populations récupérées")
    if dry:
        return {"updates": len(updates), "module": "insee_population"}
    n = bulk_update(conn, "brh_ext_commune", "insee", updates)
    log(f"   ✅ {n} UPDATE")
    return {"updated": n, "module": "insee_population"}


# ============================================================================
# MODULE 5: Géorisques (catnat, basias, basol, icpe, abf_ac1)
# ============================================================================
def fetch_georisques_for_insee(sess: requests.Session, insee: str) -> dict:
    """Récupère tout Géorisques en parallèle minimal pour 1 commune."""
    out: dict[str, Any] = {
        "catnat_total": 0,
        "catnat_inondation": 0,
        "catnat_tempete": 0,
        "catnat_secheresse": 0,
        "catnat_last_date": None,
        "basias_count": 0,
        "basol_count": 0,
        "icpe_count": 0,
        "abf_ac1_count": 0,
    }
    # Cat-Nat
    try:
        r = sess.get(
            f"{GR_API}/gaspar/catnat",
            params={"code_insee": insee, "page_size": 200},
            timeout=15,
        )
        if r.status_code == 200:
            jr = r.json()
            data = jr.get("data", [])
            out["catnat_total"] = jr.get("results", len(data)) or len(data)
            for arr in data:
                lib = (arr.get("libelle_risque_jo") or "").lower()
                if "inondation" in lib:
                    out["catnat_inondation"] += 1
                elif "tempête" in lib or "tempete" in lib or "vent" in lib:
                    out["catnat_tempete"] += 1
                elif "sécheresse" in lib or "secheresse" in lib or "argileux" in lib:
                    out["catnat_secheresse"] += 1
            # date la plus récente
            dates = [
                arr.get("dat_pub_jo")
                for arr in data
                if arr.get("dat_pub_jo")
            ]
            if dates:
                out["catnat_last_date"] = max(dates)
    except Exception:
        pass

    # Sites pollués (un seul appel /ssp pour tout : casias=BASIAS, sis=BASOL équivalent)
    try:
        r = sess.get(
            f"{GR_API}/ssp",
            params={"code_insee": insee, "page_size": 1},
            timeout=15,
        )
        if r.status_code == 200:
            jr = r.json()
            casias = jr.get("casias") or {}
            sis = jr.get("conclusions_sis") or {}
            out["basias_count"] = casias.get("results", 0) or 0
            out["basol_count"] = sis.get("results", 0) or 0
    except Exception:
        pass

    # ICPE (installations classées) — count = champ "results"
    try:
        r = sess.get(
            f"{GR_API}/installations_classees",
            params={"code_insee": insee, "page_size": 1},
            timeout=15,
        )
        if r.status_code == 200:
            out["icpe_count"] = r.json().get("results", 0) or 0
    except Exception:
        pass

    return out


def module_georisques(conn, communes: list[str], dry: bool) -> dict:
    log(f"→ MODULE 5: Géorisques (catnat/basias/basol/icpe) sur {len(communes)} communes")
    sess = requests.Session()
    sess.headers["User-Agent"] = "brh-habitat-enrich/1.0"
    updates = []
    for i, insee in enumerate(communes):
        data = fetch_georisques_for_insee(sess, insee)
        data["insee"] = insee
        updates.append(data)
        sleep_ms(THROTTLE_API_MS)
        if (i + 1) % 25 == 0:
            log(
                f"   {i + 1}/{len(communes)} (last={insee}, "
                f"catnat={data['catnat_total']}, basias={data['basias_count']}, "
                f"icpe={data['icpe_count']})"
            )
    if dry:
        return {"updates": len(updates), "module": "georisques"}
    n = bulk_update(conn, "brh_ext_commune", "insee", updates)
    log(f"   ✅ {n} UPDATE")
    return {"updated": n, "module": "georisques"}


# ============================================================================
# MODULE 6: LOVAC (data.gouv CSV)
# ============================================================================
def parse_lovac_value(v: str) -> Optional[int]:
    """LOVAC : 's' = secret stat, sinon int"""
    if v in ("", "s", "S"):
        return None
    try:
        return int(v)
    except ValueError:
        return None


def module_lovac(conn, communes: list[str], dry: bool) -> dict:
    log("→ MODULE 6: LOVAC (data.gouv CSV)")
    csv_path = os.path.join(DATA_DIR, "lovac_communes.csv")
    if not os.path.exists(csv_path):
        log(f"   Téléchargement {LOVAC_URL}")
        r = requests.get(LOVAC_URL, timeout=120)
        r.raise_for_status()
        with open(csv_path, "wb") as f:
            f.write(r.content)
    communes_set = set(communes)
    updates = []
    with open(csv_path, "r", encoding="cp1252") as f:
        reader = csv.DictReader(f, delimiter=";")
        for row in reader:
            insee = row.get("CODGEO_25") or row.get("CODGEO_24")
            if not insee or insee not in communes_set:
                continue
            pp_total = parse_lovac_value(row.get("pp_total_24", ""))
            pp_vac = parse_lovac_value(row.get("pp_vacant_24", ""))
            pp_vac_long = parse_lovac_value(row.get("pp_vacant_plus_2ans_24", ""))
            tx = pp_vac / pp_total if pp_total and pp_vac is not None else None
            tx_long = (
                pp_vac_long / pp_total
                if pp_total and pp_vac_long is not None
                else None
            )
            updates.append(
                {
                    "insee": insee,
                    "lovac_pp_total_2024": pp_total,
                    "lovac_pp_vacant_2024": pp_vac,
                    "lovac_pp_vacant_2ans_2024": pp_vac_long,
                    "lovac_tx_vacance": round(tx, 4) if tx is not None else None,
                    "lovac_tx_vacance_long": (
                        round(tx_long, 4) if tx_long is not None else None
                    ),
                }
            )
    log(f"   {len(updates)} communes 44 dans LOVAC")
    if dry:
        return {"updates": len(updates), "module": "lovac"}
    n = bulk_update(conn, "brh_ext_commune", "insee", updates)
    log(f"   ✅ {n} UPDATE")
    return {"updated": n, "module": "lovac"}


# ============================================================================
# MODULE 7: TLV (data.gouv CSV décret 22/12/2025)
# ============================================================================
def module_tlv(conn, communes: list[str], dry: bool) -> dict:
    log("→ MODULE 7: TLV / zone tendue")
    csv_path = os.path.join(DATA_DIR, "tlv.csv")
    if not os.path.exists(csv_path):
        log(f"   Téléchargement {TLV_URL}")
        r = requests.get(TLV_URL, timeout=60)
        r.raise_for_status()
        with open(csv_path, "wb") as f:
            f.write(r.content)
    communes_set = set(communes)
    updates = []
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter=";")
        for row in reader:
            insee = row.get("CODGEO25") or row.get("CODGEO")
            if not insee or insee not in communes_set:
                continue
            zonage = (
                row.get("Zonage TLV post décret 22/12/2025")
                or row.get("Zonage TLV 2023")
                or row.get("Zonage TLV 2013", "")
            )
            tendue = not zonage.startswith("3.") and "Non tendue" not in zonage and "Non TLV" not in zonage
            updates.append(
                {
                    "insee": insee,
                    "tlv_zonage": zonage,
                    "tlv_tendue": tendue,
                }
            )
    log(f"   {len(updates)} communes 44 dans TLV")
    if dry:
        return {"updates": len(updates), "module": "tlv"}
    n = bulk_update(conn, "brh_ext_commune", "insee", updates)
    log(f"   ✅ {n} UPDATE")
    return {"updated": n, "module": "tlv"}


# ============================================================================
# MODULE 8: SRU (data.gouv CSV 2025)
# ============================================================================
def parse_yes_no(s: str) -> bool:
    return s.strip().lower() in ("oui", "yes", "true", "1", "o", "y")


def module_sru(conn, communes: list[str], dry: bool) -> dict:
    log("→ MODULE 8: SRU article 55 (data.gouv 2025)")
    csv_path = os.path.join(DATA_DIR, "sru.csv")
    if not os.path.exists(csv_path):
        log(f"   Téléchargement {SRU_URL}")
        r = requests.get(SRU_URL, timeout=60)
        r.raise_for_status()
        with open(csv_path, "wb") as f:
            f.write(r.content)
    communes_set = set(communes)
    updates = []
    # SRU encodage cp1252
    with open(csv_path, "r", encoding="cp1252") as f:
        reader = csv.DictReader(f, delimiter=";")
        # Inspect headers once
        for row in reader:
            insee = row.get("Code_INSEE_commune")
            if not insee or insee not in communes_set:
                continue
            sru_active = parse_yes_no(row.get("Commune_sru_au_01_01_2025", ""))
            deficit = parse_yes_no(row.get("commune_deficitaire", ""))
            # 'Commune_carencée' header has special char — try both keys
            carencee_key = None
            for k in row.keys():
                if k and "caren" in k.lower():
                    carencee_key = k
                    break
            carencee = parse_yes_no(row.get(carencee_key, "")) if carencee_key else False
            try:
                taux = float(
                    (row.get("Taux_SRU_au_01_01_2024") or "0").replace(",", ".").replace("%", "")
                )
                # values seem in pct (e.g. 27.72) → convert to fraction
                if taux > 1.5:
                    taux = taux / 100.0
            except Exception:
                taux = None
            updates.append(
                {
                    "insee": insee,
                    "sru_assujettie": sru_active,
                    "sru_deficitaire": deficit,
                    "sru_carencee": carencee,
                    "sru_taux_lls": round(taux, 4) if taux is not None else None,
                }
            )
    log(f"   {len(updates)} communes 44 dans SRU")
    if dry:
        return {"updates": len(updates), "module": "sru"}
    # Combler les non-assujetties avec FALSE explicite (DEFAULT false déjà OK)
    n = bulk_update(conn, "brh_ext_commune", "insee", updates)
    log(f"   ✅ {n} UPDATE")
    return {"updated": n, "module": "sru"}


# ============================================================================
# MODULE 9: Mérimée (POP CSV)
# ============================================================================
def module_merimee(conn, communes: list[str], dry: bool) -> dict:
    log("→ MODULE 9: Mérimée (Monuments Historiques)")
    csv_path = os.path.join(DATA_DIR, "merimee.csv")
    if not os.path.exists(csv_path):
        log(f"   Téléchargement {MERIMEE_URL}")
        r = requests.get(MERIMEE_URL, timeout=300)
        r.raise_for_status()
        with open(csv_path, "wb") as f:
            f.write(r.content)
    communes_set = set(communes)
    counts: dict[str, dict[str, int]] = defaultdict(
        lambda: {"total": 0, "classe": 0, "inscrit": 0}
    )
    # Mérimée : pipe-delimited, encodage utf-8
    # Champs clés : COG_Insee_lors_de_la_protection, Nature_de_la_protection
    with open(csv_path, "r", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f, delimiter="|")
        for row in reader:
            insee = (
                row.get("COG_Insee_lors_de_la_protection")
                or row.get("Identifiant_Agregee")
                or ""
            ).strip().strip('"')
            if not insee or insee not in communes_set:
                continue
            typologie = (row.get("Typologie_de_la_protection") or "").lower()
            counts[insee]["total"] += 1
            if "classé" in typologie or "classe " in typologie:
                counts[insee]["classe"] += 1
            if "inscrit" in typologie:
                counts[insee]["inscrit"] += 1
    updates = []
    for insee, c in counts.items():
        updates.append(
            {
                "insee": insee,
                "merimee_count": c["total"],
                "merimee_classe": c["classe"],
                "merimee_inscrit": c["inscrit"],
            }
        )
    log(f"   {len(updates)} communes 44 avec MH")
    if dry:
        return {"updates": len(updates), "module": "merimee"}
    n = bulk_update(conn, "brh_ext_commune", "insee", updates)
    log(f"   ✅ {n} UPDATE")
    return {"updated": n, "module": "merimee"}


# ============================================================================
# MODULE 10: Fiscalité DGFiP (data.economie.gouv.fr API)
# ============================================================================
def module_fiscalite(conn, communes: list[str], dry: bool) -> dict:
    log("→ MODULE 10: Fiscalité locale DGFiP (taux_tfb/tfnb/teom)")
    sess = requests.Session()
    sess.headers["User-Agent"] = "brh-habitat-enrich/1.0"
    # Récupère le dernier millésime dispo pour le 44
    # /records?where=dep='44' AND exercice='2024'&limit=300
    updates_map: dict[str, dict] = {}
    for exercice in ("2024", "2023"):
        try:
            # Pré-encoder l'URL pour éviter conflits requests vs API ODSQL
            # API capée à limit=100 → paginer en 3 appels (207 lignes)
            for offset in (0, 100, 200):
                url = (
                    FISCALITE_URL
                    + f'?where=dep%3D%2244%22+AND+exercice%3D%22{exercice}%22'
                    + f"&limit=100&offset={offset}"
                )
                r = sess.get(url, timeout=30)
                if r.status_code != 200:
                    continue
                results = r.json().get("results", [])
                if not results:
                    break
                for rec in results:
                    com = rec.get("com")  # ex "187" → INSEE = "44" + "187"
                    if not com:
                        continue
                    insee = f"44{com.zfill(3)}"
                    # Ne pas écraser si déjà rempli par exercice plus récent
                    if insee in updates_map:
                        continue
                    updates_map[insee] = {
                        "insee": insee,
                        "taux_tfb": rec.get("taux_global_tfb"),
                        "taux_tfnb": rec.get("taux_global_tfnb"),
                        # TH résiduelle (résidences secondaires) — pas exposée directement
                        # → laisser NULL (la TH primaire a été supprimée 2023)
                        "taux_teom": rec.get("taux_plein_teom"),
                    }
                sleep_ms(THROTTLE_API_MS)
            # exercice le plus récent : on s'arrête si on a tout
            if len(updates_map) >= len(communes) - 5:
                break
        except Exception as e:
            log(f"   ⚠ fiscalité {exercice}: {e}")
    updates = list(updates_map.values())
    log(f"   {len(updates)} communes 44 avec fiscalité (sur {len(communes)})")
    if dry:
        return {"updates": len(updates), "module": "fiscalite"}
    n = bulk_update(conn, "brh_ext_commune", "insee", updates)
    log(f"   ✅ {n} UPDATE")
    return {"updated": n, "module": "fiscalite"}


# ============================================================================
# Main orchestrator
# ============================================================================
ALL_MODULES = {
    "internal_dvf": module_internal_dvf,
    "internal_sitadel": module_internal_sitadel,
    "internal_dpe_ademe": module_internal_dpe_ademe,
    "insee_population": module_insee_population,
    "georisques": module_georisques,
    "lovac": module_lovac,
    "tlv": module_tlv,
    "sru": module_sru,
    "merimee": module_merimee,
    "fiscalite": module_fiscalite,
}


def main() -> None:
    args = sys.argv[1:]
    dry = "--dry-run" in args
    only_arg = next((a for a in args if a.startswith("--only=")), None)
    only = set(only_arg.split("=")[1].split(",")) if only_arg else None

    t0 = time.time()
    log(f"🚀 Enrichissement brh_ext_commune dept={DEPT}{' [DRY-RUN]' if dry else ''}")

    conn = psycopg.connect(SUPA_DSN, autocommit=False)
    communes = fetch_communes_44(conn)
    log(f"📋 {len(communes)} communes 44 cibles")

    results = {}
    for name, fn in ALL_MODULES.items():
        if only and name not in only:
            continue
        try:
            t_mod = time.time()
            results[name] = fn(conn, communes, dry)
            results[name]["elapsed_s"] = round(time.time() - t_mod, 1)
        except Exception as e:
            log(f"❌ MODULE {name} crash: {e}")
            results[name] = {"error": str(e)}
        # courte pause inter-modules pour ne pas saturer
        time.sleep(0.5)

    conn.close()
    log(f"\n🎉 Terminé en {round(time.time() - t0, 1)}s")
    log("Résumé:")
    for name, r in results.items():
        log(f"  {name:24s} → {r}")


if __name__ == "__main__":
    main()
