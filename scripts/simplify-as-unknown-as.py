#!/usr/bin/env python3
"""
Simplifie `as unknown as XxxType` → `as XxxType` quand le double cast est inutile.

Patterns ciblés (safe à simplifier) :
  - `as unknown as XxxRow`              → `as XxxRow`
  - `as unknown as XxxRow[]`            → `as XxxRow[]`
  - `as unknown as XxxRow) ?? null`     → `as XxxRow) ?? null`
  - `as unknown as Array<...>`          → `as Array<...>`

Patterns NON simplifiés (cast intermédiaire vraiment nécessaire) :
  - `as unknown as Record<...>`         (left untouched)
  - `as unknown as { ... }`             (inline objects, kept)
  - `as unknown as L*` (Leaflet ext)    (kept)

Filtre : ne touche que src/api/ et src/pages/admin/ (cas simples).
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path("/root/projects/site-claude-code/brh-habitat/app")

# Match `as unknown as <CapitalIdentifier>(\[\])?` mais PAS `Record` / `{` / `Array<` (gardés)
# Pattern: capital identifier followed by optional [] or generic params with one type
# We allow: SomeType, SomeType[], SomeType<Args>, SomeType<Args>[]
SAFE_PATTERN = re.compile(
    r"as unknown as ([A-Z][A-Za-z0-9_]*(?:<[^>]*>)?(?:\[\])?)\b"
)

# Skip if the matched type is one of these (these need the intermediate unknown)
SKIP_TYPES = {"Record", "Array"}


def process_file(path: Path) -> tuple[int, int]:
    """Returns (matches_found, matches_replaced)."""
    src = path.read_text()
    found = SAFE_PATTERN.findall(src)
    replaced_count = 0

    def repl(m: re.Match) -> str:
        nonlocal replaced_count
        target = m.group(1)
        # Skip generics like Record<...>, Array<...>
        head = target.split("<")[0]
        if head in SKIP_TYPES:
            return m.group(0)  # untouched
        replaced_count += 1
        return f"as {target}"

    new_src = SAFE_PATTERN.sub(repl, src)
    if new_src != src:
        path.write_text(new_src)
    return len(found), replaced_count


def main() -> int:
    targets = []
    for sub in ("src/api", "src/pages/admin", "src/lib/dpe-engine"):
        for p in (ROOT / sub).rglob("*.ts"):
            if p.is_file():
                targets.append(p)
        for p in (ROOT / sub).rglob("*.tsx"):
            if p.is_file():
                targets.append(p)

    total_found = 0
    total_replaced = 0
    touched = []
    for path in sorted(targets):
        found, replaced = process_file(path)
        total_found += found
        total_replaced += replaced
        if replaced > 0:
            touched.append((path.relative_to(ROOT), replaced))

    print(f"Scanned {len(targets)} files")
    print(f"Total `as unknown as <Type>` matches in scope: {total_found}")
    print(f"Replaced (safe simplifications): {total_replaced}")
    print()
    print("Files modified:")
    for rel, count in touched:
        print(f"  {count}×  {rel}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
