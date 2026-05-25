#!/usr/bin/env python3
"""
Génère le rapport markdown final depuis les JSON audit-output/*.json
produits par e2e/audit-full-tour.spec.ts.

Usage : python3 scripts/build-audit-report.py > audit-output/REPORT.md
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

OUT_DIR = Path(__file__).parent.parent / "audit-output"

STATUS_EMOJI = {
    "ok": "✅",
    "redirect_unexpected": "🔄",
    "http_error": "🔴",
    "crash": "💥",
}


def load_results() -> list[dict]:
    results = []
    for f in sorted(OUT_DIR.glob("*.json")):
        if f.name == "REPORT.md":
            continue
        try:
            results.append(json.loads(f.read_text()))
        except json.JSONDecodeError as e:
            print(f"WARN: skip {f.name}: {e}", file=sys.stderr)
    return results


def build_report(results: list[dict]) -> str:
    lines = []
    lines.append("# 🔍 Audit Exhaustif BRH Habitat — Rapport Playwright multi-personas")
    lines.append("")
    lines.append(f"**Date** : 2026-05-25 PM")
    lines.append(f"**Méthode** : Playwright sur localhost:5173 (DB Supabase prod en lecture)")
    lines.append(f"**Comptes audit** : 6 personas créés via Supabase Auth admin API (mdp commun `AuditBrh2026.@`)")
    lines.append(f"**Total personas testés** : {len(results)}")
    lines.append("")

    # ───────────────────────────────────────────────────────────────────────
    # Tableau de synthèse global
    # ───────────────────────────────────────────────────────────────────────
    lines.append("## 📊 Vue d'ensemble")
    lines.append("")
    lines.append("| Persona | Email | Login | Routes | ✅ OK | 🔄 Redirect | 🔴 HTTP 5xx | 💥 Crash | ⚠️ Console errors |")
    lines.append("|---------|-------|-------|-------:|------:|------------:|------------:|---------:|-------------------:|")
    for r in results:
        login = "✅" if r["login_ok"] else f"❌ {r['login_error'][:30] if r['login_error'] else 'inconnu'}"
        s = r["summary"]
        lines.append(
            f"| **{r['persona']}** | `{r['email']}` | {login} | {s['total']} | "
            f"{s['ok']} | {s['redirect_unexpected']} | {s['http_error']} | {s['crash']} | "
            f"{s['routes_with_console_errors']} |"
        )
    lines.append("")

    # ───────────────────────────────────────────────────────────────────────
    # Bugs critiques agrégés (crashes + http_error)
    # ───────────────────────────────────────────────────────────────────────
    lines.append("## 🚨 Bugs critiques détectés (Top priorités)")
    lines.append("")

    critical = []
    for r in results:
        for route in r["routes"]:
            if route["status"] in ("crash", "http_error"):
                critical.append((r["persona"], route))

    if not critical:
        lines.append("Aucun bug critique (crash ou HTTP 5xx).")
    else:
        for persona, route in critical:
            lines.append(f"### 💥 `{persona}` → `{route['route']}` — **{route['status']}**")
            lines.append(f"- URL finale : `{route['final_url']}`")
            lines.append(f"- Load time : {route['load_time_ms']}ms")
            if route["unhandled_exceptions"]:
                lines.append(f"- **Exceptions** : `{route['unhandled_exceptions'][0]}`")
            if route["network_errors"]:
                lines.append(f"- **Réseau** : {len(route['network_errors'])} erreurs HTTP")
                for e in route["network_errors"][:3]:
                    lines.append(f"  - {e['status']} `{e['url']}`")
            if route["screenshot_path"]:
                lines.append(f"- 📸 {route['screenshot_path']}")
            lines.append("")
    lines.append("")

    # ───────────────────────────────────────────────────────────────────────
    # Redirects suspects (route demandée ≠ URL finale)
    # ───────────────────────────────────────────────────────────────────────
    lines.append("## 🔄 Redirects inattendus")
    lines.append("")
    redirects = []
    for r in results:
        for route in r["routes"]:
            if route["status"] == "redirect_unexpected":
                redirects.append((r["persona"], route))
    if not redirects:
        lines.append("Aucun redirect inattendu.")
    else:
        lines.append("| Persona | Route demandée | URL finale | Note |")
        lines.append("|---------|----------------|------------|------|")
        for persona, route in redirects:
            note = ""
            if "/connexion" in route["final_url"]:
                note = "→ login (guard refuse)"
            elif "/tableau-de-bord" in route["final_url"]:
                note = "→ portail particulier (guard refuse)"
            elif "/admin" in route["final_url"]:
                note = "→ admin (guard requirements)"
            lines.append(f"| `{persona}` | `{route['route']}` | `{route['final_url']}` | {note} |")
    lines.append("")

    # ───────────────────────────────────────────────────────────────────────
    # Erreurs console (consolidées)
    # ───────────────────────────────────────────────────────────────────────
    lines.append("## ⚠️ Erreurs console (par persona)")
    lines.append("")
    for r in results:
        errors_routes = [route for route in r["routes"] if route["console_errors"]]
        if not errors_routes:
            lines.append(f"### {r['persona']} — aucune erreur console")
            lines.append("")
            continue
        lines.append(f"### {r['persona']} — {len(errors_routes)} routes avec erreurs console")
        lines.append("")
        for route in errors_routes:
            lines.append(f"#### `{route['route']}` ({len(route['console_errors'])} erreurs)")
            for err in route["console_errors"][:5]:
                # Tronquer les erreurs très longues
                err_clean = err.replace("\n", " ").strip()[:200]
                lines.append(f"- `{err_clean}`")
            if len(route["console_errors"]) > 5:
                lines.append(f"- *(+ {len(route['console_errors']) - 5} autres)*")
            lines.append("")

    # ───────────────────────────────────────────────────────────────────────
    # Détail par persona (toutes routes)
    # ───────────────────────────────────────────────────────────────────────
    lines.append("## 📑 Détail exhaustif par persona")
    lines.append("")
    for r in results:
        lines.append(f"### Persona `{r['persona']}` — `{r['email']}`")
        lines.append("")
        if not r["login_ok"]:
            lines.append(f"❌ **Login a échoué** : {r['login_error']}")
            lines.append("")
            continue
        lines.append("| Route | Statut | Load (ms) | Title | URL finale | Erreurs console | Screenshot |")
        lines.append("|-------|--------|----------:|-------|------------|----------------:|------------|")
        for route in r["routes"]:
            emoji = STATUS_EMOJI.get(route["status"], "?")
            title = (route["page_title"] or "")[:35].replace("|", "/")
            final = route["final_url"].replace("http://localhost:5173", "")[:50]
            n_err = len(route["console_errors"])
            sc = f"[png]({route['screenshot_path']})" if route["screenshot_path"] else "—"
            lines.append(
                f"| `{route['route']}` | {emoji} {route['status']} | {route['load_time_ms']} | "
                f"{title} | `{final}` | {n_err} | {sc} |"
            )
        lines.append("")

    # ───────────────────────────────────────────────────────────────────────
    # Recommandations
    # ───────────────────────────────────────────────────────────────────────
    lines.append("## 🎯 Recommandations")
    lines.append("")
    total_routes = sum(r["summary"]["total"] for r in results)
    total_ok = sum(r["summary"]["ok"] for r in results)
    total_redirect = sum(r["summary"]["redirect_unexpected"] for r in results)
    total_http_err = sum(r["summary"]["http_error"] for r in results)
    total_crash = sum(r["summary"]["crash"] for r in results)
    total_console_err_routes = sum(r["summary"]["routes_with_console_errors"] for r in results)

    pct_ok = 100 * total_ok / total_routes if total_routes else 0
    lines.append(f"- **Couverture** : {total_routes} routes auditées sur 6 personas.")
    lines.append(f"- **Taux succès brut** : {total_ok}/{total_routes} = **{pct_ok:.1f}%**.")
    lines.append(f"- **Crashs** : {total_crash} → à fixer en priorité 0.")
    lines.append(f"- **HTTP 5xx** : {total_http_err} → vérifier RLS / EFs / RPCs.")
    lines.append(f"- **Redirects suspects** : {total_redirect} → vérifier guards et accès cross-persona.")
    lines.append(f"- **Routes avec erreurs console** : {total_console_err_routes} → réviser les hooks et les fetches.")
    lines.append("")
    lines.append("Prochaines actions suggérées par ordre de ROI :")
    lines.append("1. Fixer les crashs (priorité 0)")
    lines.append("2. Investiguer les redirects inattendus (guards/permissions)")
    lines.append("3. Nettoyer les erreurs console (Sentry / debug)")
    lines.append("4. Valider les workflows critiques (création prospect, signup, paiement) en mode interactive")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("*Rapport généré automatiquement par `scripts/build-audit-report.py` depuis `audit-output/*.json`.*")
    return "\n".join(lines)


def main() -> int:
    results = load_results()
    if not results:
        print("Aucun résultat JSON trouvé dans audit-output/", file=sys.stderr)
        return 1
    report = build_report(results)
    print(report)
    return 0


if __name__ == "__main__":
    sys.exit(main())
