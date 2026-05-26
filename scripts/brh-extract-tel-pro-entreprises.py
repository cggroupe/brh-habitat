#!/usr/bin/env python3
"""
brh-extract-tel-pro-entreprises.py
─────────────────────────────────────────────────
Phase 8.4 — Extraction téléphone pro public depuis entreprises non-SCI
trouvées Phase 2C (autres_entreprises[]).

DEMANDE PHILIPPE (21/05) : "tu peux y aller pour la numéro 5 extraction
des téléphones pro"

SOURCE : Apify Google Search Scraper (token /opt/stack/.env).
QUERY : "{denomination} {commune} téléphone"
PARSING : regex tel français (01-09 + 8 chiffres, formats variés).

UPDATE :
- brh_dirigeants.tel_pro_via_entreprise (1er tel trouvé)
- brh_dirigeants.autres_entreprises (JSONB enrichi avec telephone_found)

BUDGET : 9 818 SIREN × ~$0.003 = ~$30 (validé < 50€ Philippe).
ETA : ~30-45 min selon Apify queue.

USAGE :
  .venv/bin/python brh-extract-tel-pro-entreprises.py --limit 20 --sample
  .venv/bin/python brh-extract-tel-pro-entreprises.py --limit 10000
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time

import psycopg
import requests

SUPA_DSN = os.environ["BRH_SUPABASE_DB_URL"]
APIFY_TOKEN = os.environ["APIFY_TOKEN"]
APIFY_ACTOR = "apify~google-search-scraper"

# Regex tel français : 0X XX XX XX XX (espaces, points, tirets, ou collé)
PHONE_RE = re.compile(r"\b0[1-9](?:[\s.\-]?\d{2}){4}\b")
# +33 X XX XX XX XX
PHONE_INTL_RE = re.compile(r"\+33[\s.\-]?[1-9](?:[\s.\-]?\d{2}){4}")
# Email (RFC simplifié — corps@domaine.tld) — case-insensitive
EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
# Domaines à exclure (noise)
EMAIL_BLACKLIST = ("example.com", "domain.com", "email.com", "test.com", "domaine.fr",
                   "votre-domaine", "mail.fr", "site.fr")


def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def fetch_companies_to_enrich(conn, limit: int) -> list[dict]:
    """Liste les SIREN distincts à enrichir (avec leur dénomination + commune)."""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT DISTINCT ON (siren)
              siren, denomination, siege_commune, dirigeant_id
            FROM (
              SELECT
                d.id AS dirigeant_id,
                e->>'siren' AS siren,
                e->>'denomination' AS denomination,
                e->>'siege_commune' AS siege_commune,
                COALESCE(e->>'etat_administratif', 'A') AS etat
              FROM public.brh_dirigeants d
              CROSS JOIN LATERAL jsonb_array_elements(d.autres_entreprises) AS e
              WHERE d.autres_entreprises_match_count > 0
                AND (d.tel_pro_via_entreprise IS NULL OR d.tel_pro_via_entreprise = '')
            ) sub
            WHERE etat = 'A' AND siren IS NOT NULL AND denomination IS NOT NULL
            ORDER BY siren
            LIMIT %s
        """, (limit,))
        cols = [c.name for c in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]


def apify_google_search(queries: list[str]) -> list[dict]:
    """Lance un run Apify Google Search avec batch de queries (faster que 1/run)."""
    if not queries:
        return []
    payload = {
        "queries": "\n".join(queries),
        "resultsPerPage": 5,
        "maxPagesPerQuery": 1,
        "countryCode": "fr",
        "languageCode": "fr",
    }
    r = requests.post(
        f"https://api.apify.com/v2/acts/{APIFY_ACTOR}/run-sync-get-dataset-items?token={APIFY_TOKEN}",
        json=payload,
        timeout=600,
    )
    if r.status_code != 201 and r.status_code != 200:
        log(f"  Apify HTTP {r.status_code}: {r.text[:200]}")
        return []
    return r.json()


def extract_phones(text: str) -> list[str]:
    """Extrait les téléphones FR d'un texte. Retourne les uniques normalisés."""
    if not text:
        return []
    phones = set()
    for m in PHONE_RE.finditer(text):
        # Normalise: retire espaces/points/tirets
        norm = re.sub(r"[\s.\-]", "", m.group())
        phones.add(norm)
    for m in PHONE_INTL_RE.finditer(text):
        # +33 X XX XX XX XX → 0X XX XX XX XX
        digits = re.sub(r"[^0-9]", "", m.group())
        if len(digits) >= 11:  # 33 + 9 digits
            norm = "0" + digits[2:11]
            phones.add(norm)
    return sorted(phones)


def extract_emails(text: str) -> list[str]:
    """Extrait les emails d'un texte (filtre blacklist domaines noise)."""
    if not text:
        return []
    emails = set()
    for m in EMAIL_RE.finditer(text):
        e = m.group().lower()
        # Skip noise
        if any(bad in e for bad in EMAIL_BLACKLIST):
            continue
        # Skip si extension trop courte ou bizarre
        if e.endswith(('.png', '.jpg', '.svg', '.pdf', '.html')):
            continue
        emails.add(e)
    return sorted(emails)


def format_phone_fr(num: str) -> str:
    """0683533275 → 06 83 53 32 75"""
    if len(num) == 10:
        return " ".join(num[i:i+2] for i in range(0, 10, 2))
    return num


def update_dirigeant_contacts(conn, dirigeant_id: str, siren: str, tel: str | None, email: str | None) -> None:
    """Update brh_dirigeants.tel_pro_via_entreprise + email_pro_via_entreprise + flag autres_entreprises[]."""
    try:
        with conn.cursor() as cur:
            # On ne touche aux champs que si on a une valeur (COALESCE pour ne pas écraser)
            cur.execute("""
                UPDATE public.brh_dirigeants
                   SET tel_pro_via_entreprise = COALESCE(tel_pro_via_entreprise, %s::text),
                       email_pro_via_entreprise = COALESCE(email_pro_via_entreprise, %s::text),
                       autres_entreprises = (
                         SELECT jsonb_agg(
                           CASE
                             WHEN e->>'siren' = %s::text THEN
                               e || jsonb_build_object(
                                 'telephone_found', %s::text,
                                 'email_found', %s::text
                               )
                             ELSE e
                           END
                         )
                         FROM jsonb_array_elements(autres_entreprises) AS e
                       )
                 WHERE id = %s::uuid
            """, (tel, email, siren, tel, email, dirigeant_id))
    except Exception:
        conn.rollback()
        raise


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=20)
    parser.add_argument("--sample", action="store_true", help="Log détaillé par siren")
    parser.add_argument("--batch-size", type=int, default=50, help="Queries par run Apify")
    args = parser.parse_args()

    t0 = time.time()
    log("Connexion DB...")
    conn = psycopg.connect(SUPA_DSN, autocommit=False)

    log(f"Fetch top {args.limit} entreprises à enrichir...")
    companies = fetch_companies_to_enrich(conn, args.limit)
    log(f"  → {len(companies)} entreprises distinctes")

    stats = {"queried": 0, "with_tel": 0, "with_email": 0, "updated": 0, "errors": 0}

    # Batch en lots de batch_size pour optim Apify
    for batch_start in range(0, len(companies), args.batch_size):
        batch = companies[batch_start:batch_start + args.batch_size]
        queries = [
            f'"{c["denomination"]}" {c.get("siege_commune") or ""} téléphone email'.strip()
            for c in batch
        ]
        log(f"  Batch {batch_start+1}-{batch_start+len(batch)} : {len(queries)} queries...")
        results = apify_google_search(queries)
        stats["queried"] += len(batch)

        for i, item in enumerate(results):
            if i >= len(batch):
                break
            company = batch[i]
            snippets_concat = " ".join(
                f"{r.get('title', '')} {r.get('description', '')}"
                for r in item.get("organicResults", [])
            )
            phones = extract_phones(snippets_concat)
            emails = extract_emails(snippets_concat)
            if not phones and not emails:
                if args.sample:
                    log(f"    [{i+1}/{len(batch)}] {company['denomination'][:30]} → 0 tel / 0 email")
                continue

            tel = format_phone_fr(phones[0]) if phones else None
            email = emails[0] if emails else None
            if tel:
                stats["with_tel"] += 1
            if email:
                stats["with_email"] += 1
            try:
                update_dirigeant_contacts(conn, company["dirigeant_id"], company["siren"], tel, email)
                stats["updated"] += 1
                if args.sample:
                    log(f"    [{i+1}/{len(batch)}] OK {company['denomination'][:30]} → tel={tel} email={email}")
            except Exception as e:
                stats["errors"] += 1
                if args.sample:
                    log(f"    [{i+1}/{len(batch)}] DB err: {str(e)[:80]}")

        conn.commit()

    conn.close()
    elapsed = time.time() - t0
    log("")
    log("═══════════════ STATS ═══════════════")
    log(f"  Entreprises queried : {stats['queried']}")
    log(f"  Avec tel trouvé     : {stats['with_tel']} ({stats['with_tel']*100/max(stats['queried'],1):.1f}%)")
    log(f"  Avec email trouvé   : {stats['with_email']} ({stats['with_email']*100/max(stats['queried'],1):.1f}%)")
    log(f"  DB updates          : {stats['updated']}")
    log(f"  Erreurs             : {stats['errors']}")
    log(f"  Durée               : {elapsed:.1f}s")


if __name__ == "__main__":
    main()
