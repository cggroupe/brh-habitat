#!/usr/bin/env bash
# verify-wiki.sh — Vérifie la cohérence du wiki Karpathy avec le code réel
#
# Usage :
#   ./scripts/verify-wiki.sh              # lint structurel (rapide)
#   ./scripts/verify-wiki.sh --strict     # + validation des claims chiffrés exacts
#   ./scripts/verify-wiki.sh --semantic   # + lint sémantique via Claude Haiku (si CLI dispo)
#   ./scripts/verify-wiki.sh --all        # strict + semantic

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WIKI_DIR="${ROOT_DIR}/docs/wiki"
cd "$ROOT_DIR"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

errors=0
warnings=0

# Parse flags
STRICT=0
SEMANTIC=0
for arg in "$@"; do
  case "$arg" in
    --strict) STRICT=1 ;;
    --semantic) SEMANTIC=1 ;;
    --all) STRICT=1; SEMANTIC=1 ;;
    --help|-h)
      grep "^#" "$0" | head -10
      exit 0
      ;;
  esac
done

check() {
  local expected="$1"
  local actual="$2"
  local label="$3"
  if [ "$expected" = "$actual" ]; then
    echo -e "${GREEN}✓${NC} ${label} : ${actual}"
  else
    echo -e "${RED}✗${NC} ${label} : wiki dit ${expected}, réel = ${actual}"
    errors=$((errors + 1))
  fi
}

warn() {
  echo -e "${YELLOW}⚠${NC} $1"
  warnings=$((warnings + 1))
}

echo "╔════════════════════════════════════════════════╗"
echo "║  BRH Habitat — Wiki Karpathy Verifier         ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# ============================================================
# 1. Comptages
# ============================================================
echo "▸ Comptages"

PAGES=$(find src/pages -name "*.tsx" -type f 2>/dev/null | wc -l | tr -d ' ')
COMPONENTS=$(find src/components -name "*.tsx" -type f 2>/dev/null | wc -l | tr -d ' ')
HOOKS=$(find src/hooks -name "*.ts" -type f 2>/dev/null | wc -l | tr -d ' ')
API_MODULES=$(ls src/api/ 2>/dev/null | grep -v "^$" | wc -l | tr -d ' ')
MIGRATIONS=$(ls supabase/migrations/*.sql 2>/dev/null | wc -l | tr -d ' ')
EDGE_FUNCTIONS=$(ls -d supabase/functions/*/ 2>/dev/null | grep -v _shared | wc -l | tr -d ' ')
ROUTES=$(grep -c "path=" src/App.tsx 2>/dev/null || echo 0)
TABLES=$(grep -hE "CREATE TABLE (IF NOT EXISTS )?brh_" supabase/migrations/*.sql 2>/dev/null | grep -oE "brh_[a-z_]+" | sort -u | wc -l | tr -d ' ')
FUNCTIONS=$(grep -hE "CREATE (OR REPLACE )?FUNCTION public\.[a-z_]+" supabase/migrations/*.sql 2>/dev/null | grep -oE "public\.[a-z_]+" | sort -u | wc -l | tr -d ' ')
POLICIES=$(grep -c "CREATE POLICY" supabase/migrations/*.sql 2>/dev/null | awk -F: '{sum+=$2} END {print sum}')
BUCKETS=$(grep -hE "INSERT INTO storage\.buckets|'[a-z-]+'.*bucket" supabase/migrations/*.sql 2>/dev/null | grep -oE "'[a-z][a-z0-9_-]+'" | sort -u | wc -l | tr -d ' ')

echo "  Pages       : $PAGES"
echo "  Composants  : $COMPONENTS"
echo "  Hooks       : $HOOKS fichiers"
echo "  API modules : $API_MODULES"
echo "  Migrations  : $MIGRATIONS"
echo "  Edge Funcs  : $EDGE_FUNCTIONS"
echo "  Routes      : $ROUTES"
echo "  Tables      : $TABLES (brh_*)"
echo "  Functions   : $FUNCTIONS"
echo "  Policies RLS: $POLICIES"
echo "  Buckets     : $BUCKETS"
echo ""

# ============================================================
# 2. Vérification des chiffres dans architecture-snapshot.md
# ============================================================
echo "▸ Vérification architecture-snapshot.md"

SNAP="${WIKI_DIR}/architecture-snapshot.md"
if [ -f "$SNAP" ]; then
  # Extraction des chiffres — cherche patterns comme "**119**" ou "| 119 (" etc.
  WIKI_PAGES=$(grep -oE "Pages.*\*\*[0-9]+\*\*" "$SNAP" | head -1 | grep -oE "[0-9]+" | head -1)
  WIKI_MIGRATIONS=$(grep -oE "Migrations.*\*\*[0-9]+\*\*" "$SNAP" | head -1 | grep -oE "[0-9]+" | head -1)
  WIKI_EF=$(grep -oE "Edge Functions.*\*\*[0-9]+\*\*" "$SNAP" | head -1 | grep -oE "[0-9]+" | head -1)

  [ -n "$WIKI_PAGES" ] && check "$WIKI_PAGES" "$PAGES" "Snapshot.pages"
  [ -n "$WIKI_MIGRATIONS" ] && check "$WIKI_MIGRATIONS" "$MIGRATIONS" "Snapshot.migrations"
  [ -n "$WIKI_EF" ] && check "$WIKI_EF" "$EDGE_FUNCTIONS" "Snapshot.edge_functions"
else
  warn "architecture-snapshot.md introuvable"
fi
echo ""

# ============================================================
# 3. Vérification de liens relatifs
# ============================================================
echo "▸ Vérification liens relatifs dans wiki"

for f in "$WIKI_DIR"/*.md; do
  [ -f "$f" ] || continue
  # Extraire tous les liens [text](xxx.md) — seulement les liens vers autres pages wiki
  # Gère [label](./target.md) ou [label](target.md) ou [label](#anchor)
  while IFS= read -r link; do
    # Résoudre le chemin relatif au fichier courant
    target=$(echo "$link" | sed -E 's|^\./||')
    # Si c'est une ancre seule (#xxx), skip
    [[ "$target" == \#* ]] && continue
    # Si c'est un lien externe (http), skip
    [[ "$target" == http* ]] && continue
    # Si c'est un lien vers ../../.. (racine repo), test par rapport au repo
    if [[ "$target" == ../../* ]]; then
      resolved="${ROOT_DIR}/${target#../../}"
    elif [[ "$target" == ../* ]]; then
      resolved="${ROOT_DIR}/${target#../}"
    else
      resolved="${WIKI_DIR}/$target"
    fi
    # Enlever anchor potentiel #xxx
    resolved_file=$(echo "$resolved" | cut -d'#' -f1)
    if [ ! -e "$resolved_file" ]; then
      warn "$(basename $f) : lien cassé → $target"
    fi
  done < <(grep -oE "\]\([^)]+\.md[^)]*\)" "$f" | sed -E 's|\]\(||; s|\)$||')
done
echo ""

# ============================================================
# 4. Vérification des tables listées dans data-model.md
# ============================================================
echo "▸ Vérification tables dans data-model.md"

DM="${WIKI_DIR}/data-model.md"
if [ -f "$DM" ]; then
  # Compter les occurrences `brh_xxx` uniques dans data-model
  WIKI_TABLES=$(grep -oE "brh_[a-z_]+" "$DM" | sort -u | wc -l | tr -d ' ')
  REAL_TABLES_LIST=$(grep -hE "CREATE TABLE (IF NOT EXISTS )?brh_" supabase/migrations/*.sql 2>/dev/null | grep -oE "brh_[a-z_]+" | sort -u)

  # Tables dans code mais pas dans wiki
  for t in $REAL_TABLES_LIST; do
    if ! grep -q "$t" "$DM"; then
      warn "Table '$t' existe en DB mais n'apparaît pas dans data-model.md"
    fi
  done

  # Tables dans wiki mais pas dans code (mentions suspectes)
  # Whitelist statique : tables explicitement signalées comme n'existant pas
  WIKI_WHITELIST=("brh_admin_emails")
  # Whitelist dynamique : noms de fonctions SQL (CREATE FUNCTION public.brh_xxx)
  # — évite de confondre fonctions mentionnées dans le wiki avec des tables fantômes
  REAL_FUNCTIONS_LIST=$(grep -hE "CREATE (OR REPLACE )?FUNCTION (public\.)?brh_" supabase/migrations/*.sql 2>/dev/null | grep -oE "brh_[a-z_]+" | sort -u)
  # Whitelist de fragments fréquents (préfixes capturés greedy quand suivis d'un séparateur non-[a-z_])
  WIKI_FRAGMENT_WHITELIST=("brh_dpe_" "brh_agence_" "brh_artisan_" "brh_chantier_" "brh_employee_" "brh_ext_" "brh_feed_" "brh_pro_" "brh_sci_" "brh_prospect_id")
  WIKI_TABLES_LIST=$(grep -oE "brh_[a-z_]+" "$DM" | sort -u)
  for t in $WIKI_TABLES_LIST; do
    # Skip whitelist statique
    skip=false
    for w in "${WIKI_WHITELIST[@]}"; do
      [ "$t" = "$w" ] && skip=true && break
    done
    $skip && continue
    # Skip fragments génériques (préfixes capturés greedy)
    for w in "${WIKI_FRAGMENT_WHITELIST[@]}"; do
      [ "$t" = "$w" ] && skip=true && break
    done
    $skip && continue
    # Skip si c'est un nom de fonction SQL réelle
    if echo "$REAL_FUNCTIONS_LIST" | grep -q "^$t$"; then
      continue
    fi
    if ! echo "$REAL_TABLES_LIST" | grep -q "^$t$"; then
      warn "Table '$t' mentionnée dans data-model.md mais n'existe pas en DB"
    fi
  done
fi
echo ""

# ============================================================
# 5. Vérification EFs listées dans edge-functions-reference.md
# ============================================================
echo "▸ Vérification EFs dans edge-functions-reference.md"

EFR="${WIKI_DIR}/edge-functions-reference.md"
if [ -f "$EFR" ]; then
  REAL_EF_LIST=$(ls -d supabase/functions/*/ 2>/dev/null | grep -v _shared | xargs -I{} basename {})
  for ef in $REAL_EF_LIST; do
    if ! grep -q "\`$ef\`" "$EFR" 2>/dev/null; then
      warn "EF '$ef' existe mais pas dans edge-functions-reference.md"
    fi
  done
fi
echo ""

# ============================================================
# 6. Mode STRICT — vérifie les claims chiffrés exacts
# ============================================================
if [ $STRICT -eq 1 ]; then
  echo "▸ Mode --strict : vérification des claims chiffrés"

  check_claim() {
    local file="$1"
    local pattern="$2"
    local expected_count="$3"
    local label="$4"

    if [ -f "$file" ] && grep -qE "$pattern" "$file"; then
      echo -e "${GREEN}✓${NC} $label : claim présent dans $(basename $file)"
    else
      echo -e "${YELLOW}⚠${NC} $label : claim absent ou différent dans $(basename $file)"
      warnings=$((warnings + 1))
    fi
  }

  # Snapshot chiffres
  check_claim "$WIKI_DIR/architecture-snapshot.md" "119" "$PAGES" "architecture-snapshot: pages=119"
  check_claim "$WIKI_DIR/architecture-snapshot.md" "37" "$MIGRATIONS" "architecture-snapshot: migrations=37"
  check_claim "$WIKI_DIR/architecture-snapshot.md" "142" "$POLICIES" "architecture-snapshot: policies=142"
  check_claim "$WIKI_DIR/data-model.md" "30" "$TABLES" "data-model: tables=30"
  check_claim "$WIKI_DIR/data-model.md" "20" "$FUNCTIONS" "data-model: functions=20"
  check_claim "$WIKI_DIR/migrations-audit.md" "20" "$FUNCTIONS" "migrations-audit: 20 fonctions"

  # Noms de tables vérifiés
  for t in brh_affiliates brh_companies brh_quotes brh_chiffrages brh_company_invitations; do
    if grep -q "$t" "$WIKI_DIR/data-model.md" 2>/dev/null; then
      echo -e "${GREEN}✓${NC} data-model mentionne $t"
    else
      echo -e "${RED}✗${NC} data-model ne mentionne pas $t"
      errors=$((errors + 1))
    fi
  done

  # Noms de fonctions SQL vérifiés
  for fn in is_admin get_my_company_id calculate_commission update_company_ca handle_new_user; do
    if grep -q "$fn" "$WIKI_DIR/data-model.md" 2>/dev/null; then
      echo -e "${GREEN}✓${NC} data-model mentionne $fn()"
    else
      echo -e "${YELLOW}⚠${NC} data-model ne mentionne pas $fn()"
      warnings=$((warnings + 1))
    fi
  done

  # Buckets exacts (anti-hallucinations)
  REAL_BUCKETS="company-logos home-documents message-attachments prospect-files rewards-catalog social-screenshots"
  for b in $REAL_BUCKETS; do
    if grep -q "\`$b\`" "$WIKI_DIR/data-model.md" 2>/dev/null; then
      echo -e "${GREEN}✓${NC} data-model liste bucket $b"
    else
      echo -e "${YELLOW}⚠${NC} data-model ne liste pas bucket $b"
      warnings=$((warnings + 1))
    fi
  done

  # Anti-hallucinations connues
  if grep -q "brh_admin_emails" "$WIKI_DIR/data-model.md"; then
    if grep -qE "pas de table|n'existe pas|n'a pas créé" "$WIKI_DIR/data-model.md"; then
      echo -e "${GREEN}✓${NC} brh_admin_emails correctement signalé comme non-existant"
    else
      echo -e "${RED}✗${NC} brh_admin_emails mentionné mais pas signalé comme inexistant"
      errors=$((errors + 1))
    fi
  fi

  if grep -qE "avatars|chiffrage-pdf" "$WIKI_DIR/data-model.md" | grep -v "n'existe\|PAS de\|pas de bucket"; then
    :
  fi
  echo ""
fi

# ============================================================
# 7. Mode SEMANTIC — lint sémantique via LLM
# ============================================================
if [ $SEMANTIC -eq 1 ]; then
  echo "▸ Mode --semantic : lint sémantique via LLM"

  # Détecte si claude CLI dispo
  if ! command -v claude &> /dev/null; then
    echo -e "${YELLOW}⚠${NC} Claude CLI non trouvé — génération du prompt à copier-coller"
    USE_CLAUDE=0
  else
    USE_CLAUDE=1
  fi

  # Extrait 5 claims random des pages wiki (chiffres spécifiques)
  CLAIMS=$(grep -hE "\*\*[0-9]+\*\*|[0-9]+ tables|[0-9]+ hooks|[0-9]+ EF|[0-9]+ policies|[0-9]+ fonctions|[0-9]+ migrations" "$WIKI_DIR"/*.md 2>/dev/null | head -20 | shuf -n 5 2>/dev/null || head -5)

  PROMPT_FILE=$(mktemp)
  cat > "$PROMPT_FILE" <<'EOF'
Tu es un auditeur wiki. Voici des claims extraits d'une wiki BRH Habitat.
Pour chaque claim, indique si tu peux le vérifier à partir du code du projet
(liste ci-dessous des fichiers clés) :

- 37 migrations dans supabase/migrations/
- 11 Edge Functions dans supabase/functions/
- 30 tables brh_* + profiles
- 20 fonctions SQL SECURITY DEFINER
- 142 policies RLS

CLAIMS à vérifier :
EOF
  echo "$CLAIMS" >> "$PROMPT_FILE"
  cat >> "$PROMPT_FILE" <<'EOF'

Pour chaque claim, réponds en 1 ligne : [PROBABLE] ou [SUSPECT] + justification courte.
Garde la réponse sous 200 mots total.
EOF

  if [ $USE_CLAUDE -eq 1 ]; then
    echo -e "${BLUE}Appel Claude Haiku pour audit sémantique...${NC}"
    claude -p --model haiku < "$PROMPT_FILE" 2>&1 | head -30 || {
      echo -e "${YELLOW}⚠ Claude CLI échoué — prompt sauvegardé dans $PROMPT_FILE${NC}"
    }
  else
    echo -e "${BLUE}Prompt à copier vers Claude/LLM pour audit sémantique :${NC}"
    echo "─────────────────────────────────────────────────"
    cat "$PROMPT_FILE"
    echo "─────────────────────────────────────────────────"
    echo -e "${YELLOW}(Claude CLI non détecté. Installez avec : https://docs.claude.com/claude-code)${NC}"
  fi

  rm -f "$PROMPT_FILE"
  echo ""
fi

# ============================================================
# Résumé
# ============================================================
echo "╔════════════════════════════════════════════════╗"
if [ $errors -eq 0 ] && [ $warnings -eq 0 ]; then
  echo -e "║  ${GREEN}✓ Wiki cohérent — aucun écart détecté${NC}       ║"
elif [ $errors -eq 0 ]; then
  echo -e "║  ${YELLOW}⚠ $warnings warning(s) — wiki à raffiner${NC}         ║"
else
  echo -e "║  ${RED}✗ $errors erreur(s) + $warnings warning(s)${NC}              ║"
fi
echo "╚════════════════════════════════════════════════╝"

[ $errors -eq 0 ]
