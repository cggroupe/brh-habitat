#!/usr/bin/env python3
"""
Audit objet-par-objet des migrations non trackées dans schema_migrations.

Pour chaque migration locale absente de schema_migrations:
  - Parse le SQL pour extraire les objets DDL (tables, fonctions, index, policies, triggers)
  - Vérifie via Management API si chaque objet existe en prod
  - Classe la migration en SAFE_REPAIR / PARTIAL / MISSING / SKIP

Sortie: JSON détaillé + résumé exécutif.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

PROJECT_REF = "lygmmvxnmvlgynmrcpny"
MIGRATIONS_DIR = Path("/root/projects/site-claude-code/brh-habitat/app/supabase/migrations")
UNTRACKED_FILE = Path("/tmp/brh-untracked-versions.txt")
OUT_FILE = Path("/tmp/brh-migrations-audit.json")
SUMMARY_FILE = Path("/tmp/brh-migrations-audit-summary.md")


def load_token() -> str:
    env_path = Path("/opt/stack/.env")
    for line in env_path.read_text().splitlines():
        if line.startswith("SUPABASE_ACCESS_TOKEN="):
            return line.split("=", 1)[1].strip().strip("\"'")
    raise RuntimeError("SUPABASE_ACCESS_TOKEN missing in /opt/stack/.env")


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
    try:
        data = json.loads(result.stdout)
    except json.JSONDecodeError:
        raise RuntimeError(f"Non-JSON response: {result.stdout[:200]}")
    if isinstance(data, dict) and "message" in data:
        raise RuntimeError(f"DB error: {data}")
    return data


# Regex DDL extraction (case-insensitive, multiline)
RE_TABLE = re.compile(r"create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z_][a-z0-9_]*)", re.IGNORECASE)
RE_FUNCTION = re.compile(r"create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?([a-z_][a-z0-9_]*)\s*\(", re.IGNORECASE)
RE_INDEX = re.compile(r"create\s+(?:unique\s+)?index\s+(?:concurrently\s+)?(?:if\s+not\s+exists\s+)?([a-z_][a-z0-9_]*)", re.IGNORECASE)
RE_POLICY = re.compile(r"create\s+policy\s+\"?([a-z0-9_\s-]+?)\"?\s+on\s+(?:public\.)?([a-z_][a-z0-9_]*)", re.IGNORECASE)
RE_TRIGGER = re.compile(r"create\s+(?:or\s+replace\s+)?trigger\s+([a-z_][a-z0-9_]*)\s+", re.IGNORECASE)
RE_VIEW = re.compile(r"create\s+(?:or\s+replace\s+)?view\s+(?:public\.)?([a-z_][a-z0-9_]*)", re.IGNORECASE)
RE_TYPE = re.compile(r"create\s+type\s+(?:public\.)?([a-z_][a-z0-9_]*)\s+as", re.IGNORECASE)
RE_EXTENSION = re.compile(r"create\s+extension\s+(?:if\s+not\s+exists\s+)?\"?([a-z_][a-z0-9_]*)\"?", re.IGNORECASE)


def parse_migration(path: Path) -> dict:
    sql = path.read_text()
    # Strip line/block comments to reduce false positives
    sql_clean = re.sub(r"--[^\n]*", "", sql)
    sql_clean = re.sub(r"/\*.*?\*/", "", sql_clean, flags=re.DOTALL)

    return {
        "file": path.name,
        "tables": sorted(set(RE_TABLE.findall(sql_clean))),
        "functions": sorted(set(RE_FUNCTION.findall(sql_clean))),
        "indexes": sorted(set(RE_INDEX.findall(sql_clean))),
        "policies": sorted({f"{tbl}::{name.strip()}" for name, tbl in RE_POLICY.findall(sql_clean)}),
        "triggers": sorted(set(RE_TRIGGER.findall(sql_clean))),
        "views": sorted(set(RE_VIEW.findall(sql_clean))),
        "types": sorted(set(RE_TYPE.findall(sql_clean))),
        "extensions": sorted(set(RE_EXTENSION.findall(sql_clean))),
        "size_bytes": path.stat().st_size,
    }


def fetch_prod_snapshot() -> dict:
    """One-shot snapshot of all relevant prod objects (tables, functions, etc.)"""
    snap = {}
    snap["tables"] = {r["tablename"] for r in db_query(
        "SELECT tablename FROM pg_tables WHERE schemaname='public'"
    )}
    snap["functions"] = {r["proname"] for r in db_query(
        "SELECT proname FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE n.nspname='public'"
    )}
    snap["indexes"] = {r["indexname"] for r in db_query(
        "SELECT indexname FROM pg_indexes WHERE schemaname='public'"
    )}
    snap["policies"] = {f"{r['tablename']}::{r['policyname']}" for r in db_query(
        "SELECT tablename, policyname FROM pg_policies WHERE schemaname='public'"
    )}
    snap["triggers"] = {r["tgname"] for r in db_query(
        "SELECT tgname FROM pg_trigger WHERE NOT tgisinternal"
    )}
    snap["views"] = {r["viewname"] for r in db_query(
        "SELECT viewname FROM pg_views WHERE schemaname='public'"
    )}
    snap["types"] = {r["typname"] for r in db_query(
        "SELECT typname FROM pg_type t JOIN pg_namespace n ON t.typnamespace=n.oid WHERE n.nspname='public' AND typtype='c'"
    )}
    snap["extensions"] = {r["extname"] for r in db_query(
        "SELECT extname FROM pg_extension"
    )}
    return snap


def classify(parsed: dict, prod: dict) -> dict:
    """Return per-category presence + global verdict."""
    presence = {}
    missing = {}
    total_objs = 0
    missing_objs = 0
    for cat in ("tables", "functions", "indexes", "policies", "triggers", "views", "types", "extensions"):
        objs = parsed[cat]
        prod_set = prod[cat]
        present_list = [o for o in objs if o in prod_set]
        missing_list = [o for o in objs if o not in prod_set]
        presence[cat] = {"declared": len(objs), "present": len(present_list), "missing": len(missing_list)}
        if missing_list:
            missing[cat] = missing_list
        total_objs += len(objs)
        missing_objs += len(missing_list)

    if total_objs == 0:
        # No DDL extracted — likely ALTER, INSERT, UPDATE only. Manual review.
        verdict = "REVIEW_NO_DDL"
    elif missing_objs == 0:
        verdict = "SAFE_REPAIR"
    elif missing_objs == total_objs:
        verdict = "MISSING_FULL"
    else:
        verdict = "PARTIAL"

    return {"verdict": verdict, "presence": presence, "missing": missing, "total_objs": total_objs, "missing_objs": missing_objs}


def main() -> int:
    untracked = [v.strip() for v in UNTRACKED_FILE.read_text().splitlines() if v.strip()]
    print(f"Auditing {len(untracked)} untracked migrations...", file=sys.stderr)

    print("Fetching prod snapshot...", file=sys.stderr)
    prod = fetch_prod_snapshot()
    print(
        f"  tables={len(prod['tables'])} functions={len(prod['functions'])} "
        f"indexes={len(prod['indexes'])} policies={len(prod['policies'])} "
        f"triggers={len(prod['triggers'])} views={len(prod['views'])} "
        f"types={len(prod['types'])} extensions={len(prod['extensions'])}",
        file=sys.stderr,
    )

    results = []
    by_verdict: dict[str, list[str]] = {"SAFE_REPAIR": [], "PARTIAL": [], "MISSING_FULL": [], "REVIEW_NO_DDL": []}

    for version in untracked:
        matches = sorted(MIGRATIONS_DIR.glob(f"{version}_*.sql"))
        if not matches:
            print(f"  WARN: {version} no file?", file=sys.stderr)
            continue
        for path in matches:
            parsed = parse_migration(path)
            cls = classify(parsed, prod)
            entry = {"version": version, **parsed, **cls}
            results.append(entry)
            by_verdict[cls["verdict"]].append(f"{version} ({path.name})")

    OUT_FILE.write_text(json.dumps(results, indent=2, ensure_ascii=False))

    # Markdown summary
    lines = ["# Audit migrations héritées non trackées — 2026-05-24", ""]
    lines.append(f"**Total** : {len(results)} migrations auditées")
    lines.append("")
    lines.append("| Verdict | Count | % |")
    lines.append("|---|--:|--:|")
    total = len(results) or 1
    for v in ("SAFE_REPAIR", "PARTIAL", "MISSING_FULL", "REVIEW_NO_DDL"):
        c = len(by_verdict[v])
        lines.append(f"| {v} | {c} | {c*100//total}% |")
    lines.append("")
    for v in ("SAFE_REPAIR", "PARTIAL", "MISSING_FULL", "REVIEW_NO_DDL"):
        if not by_verdict[v]:
            continue
        lines.append(f"## {v} ({len(by_verdict[v])})")
        lines.append("")
        for item in by_verdict[v]:
            lines.append(f"- `{item}`")
        lines.append("")
    SUMMARY_FILE.write_text("\n".join(lines))

    print("\n=== SUMMARY ===")
    for v, lst in by_verdict.items():
        print(f"  {v}: {len(lst)}")
    print(f"\nDetailed JSON: {OUT_FILE}")
    print(f"Summary MD: {SUMMARY_FILE}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
