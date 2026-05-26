#!/usr/bin/env python3
"""
brh-enrich-dirigeants-autres-entreprises.py
─────────────────────────────────────────────
Phase 2C — Pivot dirigeant → autres entreprises (SCALE GRATUIT)

Cible : dirigeants brh_dirigeants prioritaires (multi-SCI ou propriétaires DPE)
Source : recherche-entreprises.api.gouv.fr (API publique gratuite, no quota strict)

But métier (cf docs/wiki/hub-sci-dirigeant.md) :
  Une SCI ne donne pas de tel/email. Mais son dirigeant a souvent un
  commerce/artisanat/cabinet référencé avec un téléphone pro public.
  → On contacte le dirigeant via sa boulangerie/artisanat plutôt que sa SCI.

Pipeline :
  1. Lire dirigeants à enrichir (autres_entreprises_enriched_at IS NULL,
     filtres prio configurables)
  2. Pour chaque dirigeant : appel API par nom+prenom+date_naissance
  3. Filtrer hits par date_naissance exacte (anti-homonymes)
  4. Filtrer entreprises non-SCI (nature_juridique != 6540, 6541)
  5. Update brh_dirigeants.autres_entreprises + flags
  6. Heuristique : extraire 1er tel/email pro disponible si présent

Usage :
  .venv/bin/python brh-enrich-dirigeants-autres-entreprises.py --limit 20 --sample
  .venv/bin/python brh-enrich-dirigeants-autres-entreprises.py --limit 1000

Coût : 0 € (API publique data.gouv.fr).
Rate limit : ~30 req/s prudent. 17 403 dirigeants prio ~10 min.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.parse
from typing import Any

import requests
import psycopg

SUPA_DSN = os.environ["BRH_SUPABASE_DB_URL"]
API_URL = "https://recherche-entreprises.api.gouv.fr/search"
RATE_LIMIT_DELAY = 0.05  # 20 req/s, marge confortable
TIMEOUT = 15

# Nature juridique SCI (INSEE) — à exclure car déjà connues
SCI_NATURE_JURIDIQUE = ("6540", "6541")


def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def clean_name(name: str) -> str:
    """Nettoie un nom BRH : retire les parenthèses (nom d'usage) et trim.

    Exemples :
      "GARREC (MANIEZ)" → "GARREC"
      "DUPONT-MARTIN épouse SCHMITT" → "DUPONT-MARTIN"
    """
    if not name:
        return ""
    # Retirer tout entre parenthèses
    import re
    cleaned = re.sub(r"\([^)]*\)", "", name)
    # Retirer "épouse XXX"
    cleaned = re.sub(r"\b(?:epouse|épouse|née|nee|veuve)\s+\S+", "", cleaned, flags=re.IGNORECASE)
    return cleaned.strip()


def search_dirigeant(nom: str, prenom: str, date_naissance: str | None) -> dict[str, Any]:
    """Appelle l'API et retourne les entreprises où la personne est mandataire.

    Filtres anti-homonymes :
      1. Si date_naissance fournie : matcher dans matching_etablissements
      2. Restreindre par activité non-immobilière (post-filtre)
    """
    nom_clean = clean_name(nom)
    prenom_clean = clean_name(prenom)
    if not nom_clean or not prenom_clean:
        return {"hits": [], "filtered_out_sci": 0, "filtered_out_homonyme": 0}

    q = f"{nom_clean} {prenom_clean}"
    params = {
        "q": q,
        "type": "dirigeant",
        "page": 1,
        "per_page": 25,
    }

    try:
        r = requests.get(API_URL, params=params, timeout=TIMEOUT)
        if r.status_code != 200:
            return {"hits": [], "filtered_out_sci": 0, "filtered_out_homonyme": 0, "error": f"HTTP {r.status_code}"}
        data = r.json()
    except (requests.RequestException, ValueError) as e:
        return {"hits": [], "filtered_out_sci": 0, "filtered_out_homonyme": 0, "error": str(e)[:100]}

    raw_hits = data.get("results", [])

    # Filter homonymes par date_naissance si dispo
    filtered_homonyme = 0
    filtered_sci = 0
    matches = []

    for ent in raw_hits:
        # Récupérer les dirigeants matchés dans cette entreprise
        dirigeants_api = ent.get("dirigeants", [])

        # Si on a date_naissance brh, vérifier qu'au moins un dirigeant matche
        if date_naissance:
            match_dob = False
            for d in dirigeants_api:
                api_dob = d.get("date_de_naissance") or ""
                # Format API : "YYYY-MM-DD" parfois "YYYY-MM" parfois "YYYY"
                if api_dob and (api_dob == str(date_naissance) or api_dob[:7] == str(date_naissance)[:7]):
                    match_dob = True
                    break
            if not match_dob:
                filtered_homonyme += 1
                continue

        # Filtrer SCI
        nat = (ent.get("nature_juridique") or "").strip()
        if nat in SCI_NATURE_JURIDIQUE:
            filtered_sci += 1
            continue

        siege = ent.get("siege") or {}
        matches.append({
            "siren": ent.get("siren"),
            "denomination": ent.get("nom_complet") or ent.get("nom_raison_sociale"),
            "nature_juridique": nat,
            "activite_principale": ent.get("activite_principale"),
            "etat_administratif": ent.get("etat_administratif"),
            "siege_adresse": siege.get("adresse"),
            "siege_code_postal": siege.get("code_postal"),
            "siege_commune": siege.get("commune"),
            "tranche_effectif": ent.get("tranche_effectif_salarie"),
            "date_creation": ent.get("date_creation"),
        })

    return {
        "hits": matches,
        "filtered_out_sci": filtered_sci,
        "filtered_out_homonyme": filtered_homonyme,
        "raw_count": len(raw_hits),
    }


def fetch_priority_dirigeants(conn, limit: int, sample: bool, full_bzh: bool = False) -> list[dict]:
    """Récupère les dirigeants à enrichir.

    Mode prio (par défaut) :
      - 1 ≤ nb_sci_dirigees ≤ 5 : exclut corporate (ENEDIS/RTE) tout en
        gardant SCI familiales multi-biens.
      - 1 ≤ nb_dpe_total ≤ 30 : exclut gestionnaires immobiliers / syndics.

    Mode --full-bzh : tous les dirigeants bretons non encore traités, sans
    plafond. Plus de couverture mais ratisse aussi les anciens / sans patrimoine.
    """
    with conn.cursor() as cur:
        if full_bzh:
            cur.execute("""
                SELECT d.id, d.nom, d.prenom, d.date_naissance,
                       d.nb_sci_dirigees, d.nb_dpe_total
                  FROM public.brh_dirigeants d
                 WHERE d.autres_entreprises_enriched_at IS NULL
                   AND d.nom IS NOT NULL AND d.nom <> ''
                   AND d.prenom IS NOT NULL AND d.prenom <> ''
                   AND NOT d.est_decede
                   AND EXISTS (
                     SELECT 1 FROM public.brh_dirigeant_sci ds
                      WHERE ds.dirigeant_id = d.id
                        AND ds.departement IN ('22','29','35','56','44')
                   )
              ORDER BY d.nb_dpe_total DESC NULLS LAST, d.nb_sci_dirigees DESC NULLS LAST
                 LIMIT %s
            """, (limit,))
        else:
            cur.execute("""
                SELECT d.id, d.nom, d.prenom, d.date_naissance,
                       d.nb_sci_dirigees, d.nb_dpe_total
                  FROM public.brh_dirigeants d
                 WHERE d.autres_entreprises_enriched_at IS NULL
                   AND d.nb_dpe_total BETWEEN 1 AND 30
                   AND d.nb_sci_dirigees BETWEEN 1 AND 5
                   AND d.nom IS NOT NULL AND d.nom <> ''
                   AND d.prenom IS NOT NULL AND d.prenom <> ''
                   AND NOT d.est_decede
                   AND EXISTS (
                     SELECT 1 FROM public.brh_dirigeant_sci ds
                      WHERE ds.dirigeant_id = d.id
                        AND ds.departement IN ('22','29','35','56')
                   )
              ORDER BY d.nb_dpe_total DESC, d.nb_sci_dirigees DESC
                 LIMIT %s
            """, (limit,))
        cols = [c.name for c in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]


def update_dirigeant(conn, dir_id: str, result: dict) -> None:
    """Persiste le résultat d'enrichissement pour un dirigeant."""
    hits = result["hits"]

    # Heuristique tel/email : pas dispos directement dans recherche-entreprises
    # On stocke uniquement les SIREN + adresses pour Phase 2D-bis (call séparé
    # à l'API détail pour chaque SIREN si tel/email requis).
    tel_pro = None
    email_pro = None

    with conn.cursor() as cur:
        cur.execute("""
            UPDATE public.brh_dirigeants
               SET autres_entreprises = %s::jsonb,
                   autres_entreprises_match_count = %s,
                   autres_entreprises_enriched_at = now(),
                   tel_pro_via_entreprise = %s,
                   email_pro_via_entreprise = %s
             WHERE id = %s
        """, (json.dumps(hits), len(hits), tel_pro, email_pro, dir_id))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=20)
    parser.add_argument("--sample", action="store_true",
                        help="Mode sample : log détaillé chaque dirigeant")
    parser.add_argument("--dry-run", action="store_true",
                        help="N'écrit pas en DB, affiche seulement")
    parser.add_argument("--full-bzh", action="store_true",
                        help="Filtres élargis : tous dirigeants bretons non traités (sans plafond nb_dpe/nb_sci)")
    args = parser.parse_args()

    t0 = time.time()
    log(f"Connexion DB...")
    conn = psycopg.connect(SUPA_DSN, autocommit=False)

    mode = "FULL BZH (filtres élargis)" if args.full_bzh else "prio (DPE 1-30, SCI 1-5)"
    log(f"Fetch top {args.limit} dirigeants — mode {mode}")
    dirigeants = fetch_priority_dirigeants(conn, args.limit, args.sample, full_bzh=args.full_bzh)
    log(f"  → {len(dirigeants)} dirigeants à enrichir")

    stats = {"enriched": 0, "with_hits": 0, "errors": 0, "total_hits": 0,
             "filtered_sci": 0, "filtered_homonyme": 0}

    for i, d in enumerate(dirigeants, 1):
        result = search_dirigeant(d["nom"], d["prenom"], d.get("date_naissance"))

        if "error" in result:
            stats["errors"] += 1
            if args.sample:
                log(f"  {i}/{len(dirigeants)} ❌ {d['prenom']} {d['nom']} — {result['error']}")
        else:
            stats["filtered_sci"] += result["filtered_out_sci"]
            stats["filtered_homonyme"] += result["filtered_out_homonyme"]
            stats["total_hits"] += len(result["hits"])
            if result["hits"]:
                stats["with_hits"] += 1

            if args.sample:
                hits_summary = ", ".join(f"{h['siren']}/{(h['denomination'] or '')[:25]}" for h in result["hits"][:3])
                log(f"  {i}/{len(dirigeants)} {d['prenom']} {d['nom']} (DOB {d.get('date_naissance')}) "
                    f"→ {len(result['hits'])} hits non-SCI [{result.get('filtered_out_homonyme', 0)} homonymes "
                    f"+ {result.get('filtered_out_sci', 0)} SCI filtrés]  {hits_summary}")

            if not args.dry_run:
                update_dirigeant(conn, d["id"], result)
                stats["enriched"] += 1

        time.sleep(RATE_LIMIT_DELAY)

        if i % 100 == 0:
            conn.commit()
            log(f"  ✓ checkpoint {i} commit")

    if not args.dry_run:
        conn.commit()
    conn.close()

    elapsed = time.time() - t0
    log(f"")
    log(f"═══════════════ STATS ═══════════════")
    log(f"  Dirigeants traités     : {len(dirigeants)}")
    log(f"  Enrichis (DB updated)  : {stats['enriched']}")
    log(f"  Avec au moins 1 hit    : {stats['with_hits']}")
    log(f"  Total entreprises trvs : {stats['total_hits']}")
    log(f"  Filtrés SCI            : {stats['filtered_sci']}")
    log(f"  Filtrés homonymes      : {stats['filtered_homonyme']}")
    log(f"  Erreurs API            : {stats['errors']}")
    log(f"  Durée                  : {elapsed:.1f}s ({elapsed/max(len(dirigeants),1):.2f}s/dirigeant)")


if __name__ == "__main__":
    main()
