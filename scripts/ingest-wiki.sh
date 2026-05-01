#!/usr/bin/env bash
# ingest-wiki.sh — Analyse un diff git et propose les pages wiki à mettre à jour
#
# Usage :
#   ./scripts/ingest-wiki.sh                  # compare HEAD vs working dir (staged + unstaged + untracked)
#   ./scripts/ingest-wiki.sh HEAD~1           # compare HEAD vs commit précédent
#   ./scripts/ingest-wiki.sh <commit-sha>     # compare HEAD vs commit spécifique
#
# Pattern Karpathy : après modification de code, identifier les pages wiki
# qui doivent être re-synchronisées avec les sources immuables.

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WIKI_DIR="${ROOT_DIR}/docs/wiki"
cd "$ROOT_DIR"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BASELINE="${1:-HEAD}"

echo "╔════════════════════════════════════════════════╗"
echo "║  BRH Habitat — Wiki Ingest (diff vs $BASELINE)"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Fichiers modifiés depuis baseline
if [ "$BASELINE" = "HEAD" ]; then
  CHANGED=$( (git diff --name-only HEAD 2>/dev/null; git diff --name-only --cached 2>/dev/null; git ls-files --others --exclude-standard 2>/dev/null) | sort -u | grep -v "^$" || true )
else
  CHANGED=$( git diff --name-only "$BASELINE" HEAD 2>/dev/null | sort -u | grep -v "^$" || true )
fi

if [ -z "$CHANGED" ]; then
  echo -e "${GREEN}✓ Aucun changement détecté depuis $BASELINE${NC}"
  exit 0
fi

# Filtrer les changements qui ne sont QUE dans la wiki
CODE_CHANGED=$(echo "$CHANGED" | grep -vE "^docs/wiki/|^scripts/(ingest-wiki|verify-wiki)\.sh$" || true)

echo -e "${BLUE}Tous les fichiers modifiés :${NC}"
echo "$CHANGED" | sed 's/^/  /'
echo ""

if [ -z "$CODE_CHANGED" ]; then
  echo -e "${GREEN}✓ Seule la wiki a changé — pas d'impact à analyser${NC}"
  exit 0
fi

echo -e "${BLUE}Fichiers de code/config modifiés (hors wiki) :${NC}"
echo "$CODE_CHANGED" | sed 's/^/  /'
echo ""

# ============================================================
# Mapping fichier source → pages wiki impactées
# Compatible bash 3.2 (macOS) — pas de declare -A
# Format : "page|reason" dans fichier temp
# ============================================================

IMPACT_FILE=$(mktemp)
trap "rm -f $IMPACT_FILE" EXIT

impact() {
  echo "$1|$2" >> "$IMPACT_FILE"
}

while IFS= read -r file; do
  [ -z "$file" ] && continue

  case "$file" in
    supabase/migrations/*.sql)
      impact "data-model.md" "Nouvelle migration : $file"
      impact "migrations-audit.md" "Catalog à mettre à jour : $file"
      ;;
    supabase/functions/*)
      impact "edge-functions-reference.md" "Edge Function modifiée : $file"
      ;;
    src/hooks/*|src/hooks/**/*)
      impact "hooks-reference.md" "Hook modifié : $file"
      ;;
    src/api/*)
      impact "hooks-reference.md" "API module modifié : $file"
      ;;
    src/App.tsx)
      impact "architecture-snapshot.md" "Routes modifiées"
      impact "tenant-multitenancy.md" "Feature gates potentiellement modifiés"
      ;;
    src/config/tenants/*|src/config/tier-presets.ts)
      impact "tenant-multitenancy.md" "Config tenant/features modifiée : $file"
      ;;
    src/config/TenantContext.tsx)
      impact "tenant-multitenancy.md" "TenantContext modifié"
      ;;
    package.json)
      impact "architecture-snapshot.md" "Versions stack potentiellement modifiées"
      ;;
    src/lib/diagnostic-engine.ts|src/lib/renovation-plan-engine.ts|src/lib/aides-engine.ts)
      impact "diagnostic-engine.md" "Moteur diagnostic modifié : $file"
      ;;
    src/lib/chiffrage-pdf.tsx|src/lib/ai.ts|src/lib/aiDevis.ts)
      impact "chiffrage-ia.md" "Lib chiffrage/IA modifiée : $file"
      ;;
    src/components/auth/*)
      impact "architecture-snapshot.md" "Guard auth modifié : $file"
      impact "playbooks.md" "Flow auth potentiellement impacté"
      ;;
    src/components/carnet/*)
      impact "health-carnet.md" "Composant carnet modifié : $file"
      ;;
    public/sw.js)
      impact "performance.md" "Service Worker modifié — vérifier cache version"
      ;;
    vercel.json)
      impact "performance.md" "Headers HTTP / CSP modifiés"
      impact "security-status.md" "Config sécurité modifiée"
      ;;
    ARCHITECTURE.md)
      impact "security-status.md" "Audit architecture modifié"
      impact "architecture-snapshot.md" "Snapshot à re-synchroniser"
      ;;
    PARTNER-PLATFORM.md)
      impact "partner-platform.md" "Blueprint partner modifié"
      ;;
  esac
done <<< "$CODE_CHANGED"

# ============================================================
# Rapport
# ============================================================

if [ ! -s "$IMPACT_FILE" ]; then
  echo -e "${GREEN}✓ Aucune page wiki impactée par ces changements${NC}"
  exit 0
fi

# Pages uniques impactées
UNIQUE_PAGES=$(cut -d'|' -f1 "$IMPACT_FILE" | sort -u)

echo -e "${YELLOW}⚠ Pages wiki à mettre à jour :${NC}"
echo ""

while IFS= read -r page; do
  [ -z "$page" ] && continue
  page_path="${WIKI_DIR}/${page}"
  if [ -f "$page_path" ]; then
    echo -e "${BLUE}  📝 docs/wiki/${page}${NC}"
  else
    echo -e "${YELLOW}  ⚠ docs/wiki/${page} (n'existe pas encore !)${NC}"
  fi
  # Toutes les raisons pour cette page
  grep "^${page}|" "$IMPACT_FILE" | cut -d'|' -f2- | sed 's/^/    - /'
  echo ""
done <<< "$UNIQUE_PAGES"

# ============================================================
# Draft entrée log.md
# ============================================================

echo "─────────────────────────────────────────────────"
echo -e "${BLUE}Draft entrée log.md (à compléter) :${NC}"
echo "─────────────────────────────────────────────────"
cat <<EOF

## $(date +%Y-%m-%d) — {titre court}

**Contexte** : {pourquoi cette modification}

**Fichiers modifiés** :
EOF
echo "$CODE_CHANGED" | sed 's/^/- `/' | sed 's/$/`/'
echo ""
echo "**Pages wiki impactées** :"
while IFS= read -r page; do
  [ -z "$page" ] && continue
  echo "- [${page}](${page})"
done <<< "$UNIQUE_PAGES"
cat <<EOF

**Risque** : {None / Low / Medium / High}
**Tests** : {résultat}
**Status** : {✅ DONE / 🟡 PARTIEL / 🔴 BLOQUÉ}

EOF

echo ""
echo -e "${GREEN}Prochaines étapes :${NC}"
echo "  1. Mettre à jour les pages listées ci-dessus"
echo "  2. Ajouter l'entrée dans docs/wiki/log.md"
echo "  3. Lancer : ./scripts/verify-wiki.sh"
echo ""
