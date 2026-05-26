#!/usr/bin/env python3
"""
Data Concordance Audit — vérifie que ce qui s'affiche dans BRH Habitat est
COHÉRENT avec la vérité en DB.

Détecte les bugs type "fiche dirigeant affiche 0 patrimoine alors que la SCI
qu'il dirige a 18 DPE" — ce que les sélecteurs Playwright ne peuvent pas voir.

Architecture :
  1. Sample top-N entités (SCI, dirigeants, DPE owner connu) en DB
  2. Pour chaque entité : récupère la "vérité DB" (counts, relations)
  3. Login Playwright comme employé
  4. Navigate la fiche → extrait DOM (texte visible)
  5. Envoie à Claude Haiku : "voici DB, voici DOM, écarts ?"
  6. Génère rapport markdown des incohérences

Usage :
  BRH_E2E_EMAIL=audit-employe@test.brh BRH_E2E_PASSWORD=AuditBrh2026.@ \\
    python3 scripts/data-concordance-audit.py [--limit=10] [--type=sci|dirigeant|dpe]

Coût LLM estimé : ~$0.05-0.10 par entité (Haiku 4.5). 50 entités = ~$5.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

import psycopg2
from psycopg2.extras import RealDictCursor
from playwright.sync_api import sync_playwright, Page
from anthropic import Anthropic

# ─── Config ───────────────────────────────────────────────────────────────
BASE_URL = os.environ.get("BRH_AUDIT_URL", "https://brh-habitat.vercel.app")
EMAIL = os.environ.get("BRH_E2E_EMAIL", "")
PASSWORD = os.environ.get("BRH_E2E_PASSWORD", "")
ANTHROPIC_KEY = ""
for line in Path("/opt/stack/.env").read_text().splitlines():
    if line.startswith("ANTHROPIC_API_KEY="):
        ANTHROPIC_KEY = line.split("=", 1)[1].strip().strip("\"'")

if not EMAIL or not PASSWORD:
    print("ERROR: BRH_E2E_EMAIL et BRH_E2E_PASSWORD requis (compte employé)", file=sys.stderr)
    sys.exit(1)

OUT_DIR = Path(__file__).parent.parent / "audit-output"
OUT_DIR.mkdir(exist_ok=True)
SCREENSHOT_DIR = OUT_DIR / "concordance-screenshots"
SCREENSHOT_DIR.mkdir(exist_ok=True)

claude = Anthropic(api_key=ANTHROPIC_KEY)


def load_db_url() -> str:
    for line in Path("/opt/stack/.env").read_text().splitlines():
        if line.startswith("BRH_SUPABASE_DB_URL="):
            return line.split("=", 1)[1].strip().strip("\"'")
    raise RuntimeError("BRH_SUPABASE_DB_URL missing")


# ─── DB queries — "vérité ground truth" ───────────────────────────────────
def fetch_top_sci(conn, limit: int = 15) -> list[dict]:
    """Top SCI par nb DPE détenus — précomputé via GROUP BY."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            WITH owner_counts AS (
              SELECT owner_siren AS siren, count(*) AS nb_dpe
              FROM brh_dpe_prospects
              WHERE owner_siren IS NOT NULL
              GROUP BY owner_siren
              ORDER BY nb_dpe DESC
              LIMIT %s
            )
            SELECT s.siren, s.denomination, s.commune, oc.nb_dpe,
              jsonb_array_length(s.dirigeants) AS nb_dirigeants
            FROM owner_counts oc
            JOIN brh_sci_companies s ON s.siren = oc.siren
            ORDER BY oc.nb_dpe DESC
        """, (limit * 2,))  # ×2 car certains owner_siren peuvent ne pas être en brh_sci_companies
        return [dict(r) for r in cur.fetchall()[:limit]]


def fetch_top_dirigeants(conn, limit: int = 15) -> list[dict]:
    """Top dirigeants par nb DPE via SCI — précomputé."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            WITH dirigeant_dpe AS (
              SELECT ds.dirigeant_id, count(*) AS nb_dpe_via_sci, count(DISTINCT ds.siren) AS nb_sci
              FROM brh_dirigeant_sci ds
              JOIN brh_dpe_prospects dp ON dp.owner_siren = ds.siren
              GROUP BY ds.dirigeant_id
              ORDER BY nb_dpe_via_sci DESC
              LIMIT %s
            )
            SELECT d.id::text AS dirigeant_id, d.nom, d.prenom, dd.nb_sci, dd.nb_dpe_via_sci
            FROM dirigeant_dpe dd
            JOIN brh_dirigeants d ON d.id = dd.dirigeant_id
            ORDER BY dd.nb_dpe_via_sci DESC
        """, (limit,))
        return [dict(r) for r in cur.fetchall()]


def fetch_sample_dpe(conn, limit: int = 10) -> list[dict]:
    """Sample DPE avec owner_siren = vérification fiche adresse."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT id, adresse, commune, code_postal, etiquette_dpe, owner_name, owner_siren
            FROM brh_dpe_prospects
            WHERE owner_siren IS NOT NULL AND latitude IS NOT NULL
            ORDER BY id
            LIMIT %s
        """, (limit,))
        return [dict(r) for r in cur.fetchall()]


# ─── Playwright ───────────────────────────────────────────────────────────
def login(page: Page) -> bool:
    page.goto(f"{BASE_URL}/connexion", wait_until="networkidle", timeout=20_000)
    page.locator('input[type="email"]').fill(EMAIL)
    page.locator('input[type="password"]').fill(PASSWORD)
    page.locator('button[type="submit"]').click()
    # Wait soit redirect, soit cockpit visible (bug app : pathname reste /connexion
    # mais cockpit s'affiche). On vérifie le DOM.
    try:
        page.wait_for_selector("text=/Cockpit|Espace |Audit Employé/", timeout=15_000)
    except Exception:
        return False
    page.wait_for_load_state("networkidle", timeout=10_000)

    # Click switcher si nécessaire
    btn = page.get_by_role("button", name="Espace ").or_(page.get_by_role("button", name="Console "))
    try:
        if btn.first.is_visible(timeout=2_000):
            btn.first.click()
            page.wait_for_load_state("networkidle", timeout=10_000)
    except Exception:
        pass

    # Navigate vers /employe direct pour s'assurer qu'on est dans le bon contexte
    page.goto(f"{BASE_URL}/employe", wait_until="networkidle", timeout=15_000)
    return True


def extract_dom_text(page: Page, max_chars: int = 4000) -> str:
    """Récupère le texte visible utile (filtré pour économiser tokens)."""
    text = page.locator("main, [role='main']").first.inner_text(timeout=5_000)
    # Filtre lignes trop courtes/répétées
    lines = [l.strip() for l in text.split("\n") if len(l.strip()) > 1]
    return "\n".join(lines)[:max_chars]


# ─── LLM analyse ──────────────────────────────────────────────────────────
def analyze_concordance(entity_kind: str, db_truth: dict, dom_text: str) -> dict:
    """Demande à Claude Haiku de comparer DB vs DOM, retourne JSON {ok, ecarts}."""
    prompt = f"""Tu es un auditeur QA pour BRH Habitat (app rénovation Bretagne).

Compare la VÉRITÉ DB et le RENDU UI affiché à l'utilisateur. Identifie les ÉCARTS où le DOM contredit la DB ou omet de la donnée importante.

## Entité testée
Type : {entity_kind}
Vérité DB : {json.dumps(db_truth, default=str, ensure_ascii=False)}

## DOM affiché (texte visible de la page)
```
{dom_text}
```

## Tâche
Réponds UNIQUEMENT en JSON valide :
{{
  "concordance_ok": true|false,
  "ecarts": [
    {{ "severite": "critique|moyen|mineur", "description": "ex: 'page affiche 0 DPE alors que DB en a 18'" }}
  ],
  "data_visible_dom": {{ "champs_clés": "valeurs observées" }},
  "verdict_court": "1 phrase"
}}

Ne mets PAS de markdown autour du JSON. Sois bref."""

    msg = claude.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=800,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = msg.content[0].text.strip()
    # Strip markdown si présent
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.startswith("json"):
            raw = raw[4:].strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"concordance_ok": False, "ecarts": [{"severite": "moyen", "description": f"LLM response not JSON: {raw[:200]}"}], "verdict_court": "Parse error"}


# ─── Audit runs ───────────────────────────────────────────────────────────
def audit_sci(page: Page, sci: dict) -> dict:
    siren = sci["siren"]
    url = f"{BASE_URL}/employe/leads/entreprise/{siren}"
    page.goto(url, wait_until="networkidle", timeout=20_000)
    page.wait_for_timeout(1500)
    try:
        sshot = SCREENSHOT_DIR / f"sci_{siren}.png"
        page.screenshot(path=str(sshot), full_page=True, timeout=8_000)
    except Exception:
        pass
    dom = extract_dom_text(page)
    analysis = analyze_concordance("SCI (entreprise immobilière)", sci, dom)
    return {"entity_type": "sci", "id": siren, "url": url, "db_truth": sci, "analysis": analysis}


def audit_dirigeant(page: Page, dirigeant: dict) -> dict:
    fullname = f"{dirigeant['prenom']} {dirigeant['nom']}"
    url = f"{BASE_URL}/employe/leads/personne/{fullname}"  # Playwright encode auto
    page.goto(url, wait_until="networkidle", timeout=20_000)
    page.wait_for_timeout(1500)
    try:
        sshot = SCREENSHOT_DIR / f"dirigeant_{dirigeant['dirigeant_id']}.png"
        page.screenshot(path=str(sshot), full_page=True, timeout=8_000)
    except Exception:
        pass
    dom = extract_dom_text(page)
    analysis = analyze_concordance("Dirigeant SCI (personne physique)", dirigeant, dom)
    return {"entity_type": "dirigeant", "id": dirigeant["dirigeant_id"], "url": url, "db_truth": dirigeant, "analysis": analysis}


def audit_dpe(page: Page, dpe: dict) -> dict:
    dpe_id = dpe["id"]
    url = f"{BASE_URL}/employe/leads/adresse/{dpe_id}"
    page.goto(url, wait_until="networkidle", timeout=20_000)
    page.wait_for_timeout(1500)
    try:
        sshot = SCREENSHOT_DIR / f"dpe_{dpe_id}.png"
        page.screenshot(path=str(sshot), full_page=True, timeout=8_000)
    except Exception:
        pass
    dom = extract_dom_text(page)
    analysis = analyze_concordance("DPE (adresse logement)", dpe, dom)
    return {"entity_type": "dpe", "id": dpe_id, "url": url, "db_truth": dpe, "analysis": analysis}


# ─── Rapport ──────────────────────────────────────────────────────────────
def build_report(results: list[dict]) -> str:
    lines = []
    lines.append("# 🔍 Audit Concordance Data — BRH Habitat")
    lines.append("")
    lines.append(f"**Date** : 2026-05-25 PM")
    lines.append(f"**Méthode** : Comparaison vérité DB vs DOM affiché via Playwright + Claude Haiku")
    lines.append(f"**URL testée** : {BASE_URL}")
    lines.append(f"**Total entités testées** : {len(results)}")
    lines.append("")

    ok_count = sum(1 for r in results if r["analysis"].get("concordance_ok"))
    fail_count = len(results) - ok_count
    lines.append(f"## 📊 Résumé : {ok_count}/{len(results)} cohérents · **{fail_count} écarts détectés**")
    lines.append("")

    # Ecarts critiques d'abord
    critiques = []
    moyens = []
    mineurs = []
    for r in results:
        for e in r["analysis"].get("ecarts", []):
            sev = e.get("severite", "moyen")
            entry = {"entity": r["entity_type"], "id": r["id"], "url": r["url"], "description": e.get("description"), "verdict": r["analysis"].get("verdict_court", "")}
            if sev == "critique":
                critiques.append(entry)
            elif sev == "moyen":
                moyens.append(entry)
            else:
                mineurs.append(entry)

    if critiques:
        lines.append("## 🚨 Écarts CRITIQUES")
        lines.append("")
        for c in critiques:
            lines.append(f"- **{c['entity']} {c['id']}** → {c['description']}")
            lines.append(f"  - URL : {c['url']}")
        lines.append("")

    if moyens:
        lines.append("## 🟠 Écarts moyens")
        lines.append("")
        for m in moyens:
            lines.append(f"- **{m['entity']} {m['id']}** → {m['description']}")
        lines.append("")

    if mineurs:
        lines.append(f"## 🟡 Écarts mineurs ({len(mineurs)})")
        lines.append("")
        for m in mineurs[:10]:
            lines.append(f"- **{m['entity']} {m['id']}** → {m['description']}")
        if len(mineurs) > 10:
            lines.append(f"- *(+ {len(mineurs)-10} autres)*")
        lines.append("")

    lines.append("## 📑 Détail par entité")
    lines.append("")
    for r in results:
        status = "✅" if r["analysis"].get("concordance_ok") else "❌"
        lines.append(f"### {status} {r['entity_type']} `{r['id']}`")
        lines.append(f"- URL : {r['url']}")
        lines.append(f"- Vérité DB : `{json.dumps(r['db_truth'], default=str, ensure_ascii=False)[:200]}`")
        lines.append(f"- Verdict LLM : {r['analysis'].get('verdict_court', '?')}")
        if r["analysis"].get("ecarts"):
            for e in r["analysis"]["ecarts"]:
                lines.append(f"  - {e.get('severite','?')}: {e.get('description')}")
        lines.append("")

    return "\n".join(lines)


# ─── Main ─────────────────────────────────────────────────────────────────
def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=10, help="Entités par type")
    ap.add_argument("--type", choices=["sci", "dirigeant", "dpe", "all"], default="all")
    args = ap.parse_args()

    print(f"Audit Concordance Data sur {BASE_URL}", file=sys.stderr)
    print(f"Compte : {EMAIL}", file=sys.stderr)
    print(f"Limit par type : {args.limit}", file=sys.stderr)

    # 1. Vérité DB
    conn = psycopg2.connect(load_db_url())
    sci_list = fetch_top_sci(conn, args.limit) if args.type in ("sci", "all") else []
    dirigeant_list = fetch_top_dirigeants(conn, args.limit) if args.type in ("dirigeant", "all") else []
    dpe_list = fetch_sample_dpe(conn, args.limit) if args.type in ("dpe", "all") else []
    conn.close()

    print(f"  SCI: {len(sci_list)} · Dirigeants: {len(dirigeant_list)} · DPE: {len(dpe_list)}", file=sys.stderr)

    # 2. Playwright
    results = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        page = context.new_page()

        print("Login...", file=sys.stderr)
        if not login(page):
            print("ERROR: login failed", file=sys.stderr)
            browser.close()
            return 1
        print(f"  Logged in, current URL: {page.url}", file=sys.stderr)

        for i, sci in enumerate(sci_list):
            print(f"  [{i+1}/{len(sci_list)}] SCI {sci['siren']} {sci['denomination'][:30]} ({sci['nb_dpe']} DPE)...", file=sys.stderr)
            try:
                r = audit_sci(page, sci)
                results.append(r)
            except Exception as e:
                print(f"    ⚠️ Error: {e}", file=sys.stderr)

        for i, d in enumerate(dirigeant_list):
            print(f"  [{i+1}/{len(dirigeant_list)}] Dirigeant {d['prenom']} {d['nom']} ({d['nb_dpe_via_sci']} DPE via SCI)...", file=sys.stderr)
            try:
                r = audit_dirigeant(page, d)
                results.append(r)
            except Exception as e:
                print(f"    ⚠️ Error: {e}", file=sys.stderr)

        for i, dpe in enumerate(dpe_list):
            print(f"  [{i+1}/{len(dpe_list)}] DPE #{dpe['id']} {dpe['adresse'][:30] if dpe.get('adresse') else '?'}...", file=sys.stderr)
            try:
                r = audit_dpe(page, dpe)
                results.append(r)
            except Exception as e:
                print(f"    ⚠️ Error: {e}", file=sys.stderr)

        browser.close()

    # 3. Save JSON + rapport
    json_path = OUT_DIR / "concordance-results.json"
    json_path.write_text(json.dumps(results, indent=2, default=str, ensure_ascii=False))
    print(f"\n✅ Results JSON : {json_path}", file=sys.stderr)

    report = build_report(results)
    report_path = OUT_DIR / "CONCORDANCE.md"
    report_path.write_text(report)
    print(f"✅ Rapport : {report_path}", file=sys.stderr)

    # Print summary stats
    ok = sum(1 for r in results if r["analysis"].get("concordance_ok"))
    print(f"\n📊 {ok}/{len(results)} cohérents, {len(results)-ok} écarts détectés", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
