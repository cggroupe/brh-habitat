#!/usr/bin/env python3
"""
Marque les 76 migrations héritées comme appliquées dans `supabase_migrations.schema_migrations`.

Stratégie : INSERT direct via Management API (équivalent à `supabase migration repair --status applied`).
- Idempotent : ON CONFLICT (version) DO NOTHING
- Vérifie le nombre tracké avant/après
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

PROJECT_REF = "lygmmvxnmvlgynmrcpny"
MIGRATIONS_DIR = Path("/root/projects/site-claude-code/brh-habitat/app/supabase/migrations")


def load_token() -> str:
    for line in Path("/opt/stack/.env").read_text().splitlines():
        if line.startswith("SUPABASE_ACCESS_TOKEN="):
            return line.split("=", 1)[1].strip().strip("\"'")
    raise RuntimeError("SUPABASE_ACCESS_TOKEN missing")


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
        raise RuntimeError(f"DB error: {data['message']}")
    return data


def sql_escape(s: str) -> str:
    return s.replace("'", "''")


def main() -> int:
    # 1. Snapshot tracked versions
    tracked_rows = db_query("SELECT version FROM supabase_migrations.schema_migrations")
    tracked = {r["version"] for r in tracked_rows}
    print(f"Tracked before: {len(tracked)}", file=sys.stderr)

    # 2. Scan all local migration files
    all_files = sorted(MIGRATIONS_DIR.glob("*.sql"))
    file_pairs = []  # (version, name)
    for path in all_files:
        m = re.match(r"^(\d+)_(.+)\.sql$", path.name)
        if not m:
            print(f"  SKIP malformed: {path.name}", file=sys.stderr)
            continue
        version, name = m.group(1), m.group(2)
        file_pairs.append((version, name))

    # Detect duplicate versions (after rename)
    version_counts: dict[str, int] = {}
    for v, _ in file_pairs:
        version_counts[v] = version_counts.get(v, 0) + 1
    duplicates = [v for v, c in version_counts.items() if c > 1]
    if duplicates:
        print(f"  ⚠️ DUPLICATE versions still present: {duplicates}", file=sys.stderr)
        return 1

    # 3. Compute untracked
    untracked = [(v, n) for v, n in file_pairs if v not in tracked]
    print(f"Local files: {len(file_pairs)} | Untracked: {len(untracked)}", file=sys.stderr)

    if not untracked:
        print("Nothing to repair. ✅")
        return 0

    # 4. Batch INSERT with ON CONFLICT DO NOTHING
    # Build a single multi-row insert (small enough for 76 rows)
    values = ",".join(
        f"('{sql_escape(v)}', '{sql_escape(n)}', ARRAY[]::text[])"
        for v, n in untracked
    )
    sql = (
        "INSERT INTO supabase_migrations.schema_migrations (version, name, statements) "
        f"VALUES {values} ON CONFLICT (version) DO NOTHING "
        "RETURNING version"
    )
    inserted = db_query(sql)
    print(f"Inserted: {len(inserted)} rows", file=sys.stderr)

    # 5. Verify
    after = db_query("SELECT count(*) AS c FROM supabase_migrations.schema_migrations")
    print(f"Tracked after: {after[0]['c']}", file=sys.stderr)

    diff_after = db_query(
        "SELECT count(*) AS c FROM supabase_migrations.schema_migrations"
    )
    expected = len(tracked) + len(untracked)
    if diff_after[0]["c"] >= expected:
        print(f"✅ Success — {len(untracked)} migrations marked as applied")
        return 0
    else:
        print(f"⚠️ Mismatch: expected ≥{expected}, got {diff_after[0]['c']}")
        return 2


if __name__ == "__main__":
    sys.exit(main())
