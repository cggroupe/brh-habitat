#!/usr/bin/env python3
"""
Refactor `src/types/database.ts` : remplace les interfaces Row manuelles par des
alias des types générés (`Database['public']['Tables']['xxx']['Row']`).

Aligne les types frontend avec la réalité DB (nullable, défauts) et supprime
les divergences silencieuses qui forçaient l'usage de `as unknown as`.

Naming convention BRH :
  BrhXxxRow → brh_xxx
  BrhXxxYyyRow → brh_xxx_yyy
  ProfileRow → profiles (cas non-brh à gérer manuellement)

Conserve :
  - Les enums string literal (DiagnosticStatus, etc.)
  - Les types composés (PaginatedX) déclarés ailleurs
  - Les interfaces qui ne mappent aucune table DB (gardées telles quelles avec note)
"""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

APP = Path("/root/projects/site-claude-code/brh-habitat/app")
DB_TS = APP / "src/types/database.ts"
GEN_TS = APP / "src/types/database-generated.ts"

# Mapping nom interface → nom table DB. Cas où le snake_case déviait du naming auto.
# Auto-derivation: BrhArticleRow → brh_articles (snake + plural), traité ci-dessous.
SPECIAL_TABLE_MAP = {
    "ProfileRow": "profiles",
    # ajoute ici si naming non régulier détecté
}


def extract_db_tables() -> set[str]:
    """Liste les tables exposées par database-generated.ts (parse léger)."""
    content = GEN_TS.read_text()
    # Pattern: dans `public: { Tables: { ... } }`, chaque table a `<name>: { Row: { ... } }`
    # Match les lignes `      <table_name>: {`
    tables = set()
    in_tables_block = False
    depth = 0
    for line in content.splitlines():
        stripped = line.strip()
        if "Tables: {" in line and not in_tables_block:
            in_tables_block = True
            depth = 0
            continue
        if in_tables_block:
            depth += line.count("{") - line.count("}")
            m = re.match(r"^\s{6}([a-z_][a-z0-9_]*): \{$", line)
            if m:
                tables.add(m.group(1))
            if depth < 0:
                # Sortie du bloc Tables
                in_tables_block = False
    return tables


def camel_to_snake(name: str) -> str:
    """BrhArticleRow → brh_article. (singulier — ajustement plural à la main)"""
    # Enlève suffixe Row si présent
    if name.endswith("Row"):
        name = name[:-3]
    # Insère _ avant chaque majuscule, puis lowercase
    s = re.sub(r"(?<!^)(?=[A-Z])", "_", name).lower()
    return s


def derive_table_name(interface_name: str, db_tables: set[str]) -> str | None:
    """
    Tente de deviner le nom de table pour une interface donnée.
    Essaie : snake (singulier), snake (pluriel s/es), mapping spécial.
    Retourne None si aucun match dans db_tables.
    """
    if interface_name in SPECIAL_TABLE_MAP:
        candidate = SPECIAL_TABLE_MAP[interface_name]
        return candidate if candidate in db_tables else None

    snake = camel_to_snake(interface_name)
    # Tentatives plural simples
    candidates = [
        snake,
        snake + "s",
        snake + "es",
        snake[:-1] + "ies" if snake.endswith("y") else snake,
    ]
    # Custom : "history" déjà au pluriel anglais
    if snake.endswith("history"):
        candidates.insert(0, snake)
    for c in candidates:
        if c in db_tables:
            return c
    return None


# Regex pour matcher une interface complète : `export interface X { ... }`
RE_INTERFACE_BLOCK = re.compile(
    r"^export interface ([A-Z][A-Za-z0-9]*)\s*\{[^{}]*\}\s*$",
    re.MULTILINE,
)


def main() -> int:
    db_tables = extract_db_tables()
    print(f"DB tables détectées : {len(db_tables)}", file=sys.stderr)

    src = DB_TS.read_text()

    replaced = []
    skipped = []

    def replace(match: re.Match) -> str:
        interface_name = match.group(1)
        original_block = match.group(0)
        table = derive_table_name(interface_name, db_tables)
        if not table:
            skipped.append(interface_name)
            return original_block  # leave untouched
        replaced.append((interface_name, table))
        return (
            f"export type {interface_name} = "
            f"Database['public']['Tables']['{table}']['Row']"
        )

    new_src = RE_INTERFACE_BLOCK.sub(replace, src)

    # Garantir que `import type { Database }` est présent
    if "from '@/types/database-generated'" not in new_src and "from './database-generated'" not in new_src:
        # Insère l'import en tête
        new_src = "import type { Database } from './database-generated'\n\n" + new_src

    DB_TS.write_text(new_src)

    print(f"\n=== {len(replaced)} interfaces remplacées par des alias ===")
    for name, table in replaced:
        print(f"  {name} → {table}")
    if skipped:
        print(f"\n=== {len(skipped)} interfaces conservées (pas de table mappée) ===")
        for name in skipped:
            print(f"  {name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
