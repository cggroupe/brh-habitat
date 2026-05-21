#!/bin/bash
# brh-night-orchestrator.sh — Enchaîne les batches nocturnes en SÉRIE
# pour éviter saturation pool Supabase (incident 21/05 14h).
#
# Plan validé Philippe 21/05 :
#   1) Apify tel pro reprise (6 250 entreprises restantes)
#   2) Code INSEE commune sur DPE E (124 630 via API BAN reverse)
#   3) DVF historique 2020-2023 (4 CSV gzippés)
#   4) BDNB Bretagne (4 pg_dump, à évaluer selon temps)

set -u
LOG=/tmp/brh-night-$(date +%Y%m%d-%H%M%S).log
exec > >(tee -a "$LOG") 2>&1

source /opt/stack/.env
export BRH_SUPABASE_DB_URL APIFY_TOKEN SUPABASE_ACCESS_TOKEN

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"; }
sep() { log "═══════════════════════════════════════════════════════════════"; }

sep
log "🌙 BRH NIGHT ORCHESTRATOR — démarrage"
log "Log : $LOG"
sep

# ─────────────────────────────────────────────────────────────────────────────
# Étape 1 — Apify tel pro reprise
# ─────────────────────────────────────────────────────────────────────────────
log "[1/4] Apify tel pro reprise (idempotent, filtre tel_pro IS NULL)"
T0=$(date +%s)
python3 /opt/stack/scripts/brh-extract-tel-pro-entreprises.py --limit 10000 --batch-size 50 2>&1 | tail -8
T1=$(date +%s)
log "[1/4] terminé en $((T1-T0))s"
sep

# Sleep 30s entre étapes pour respiration pool
log "Pause 30s..."
sleep 30

# ─────────────────────────────────────────────────────────────────────────────
# Étape 2 — Code INSEE commune sur DPE E (via API BAN reverse)
# ─────────────────────────────────────────────────────────────────────────────
log "[2/4] Enrichissement code INSEE commune sur DPE E"
T0=$(date +%s)
python3 /opt/stack/scripts/brh-enrich-insee-dpe-e.py 2>&1 | tail -8
T1=$(date +%s)
log "[2/4] terminé en $((T1-T0))s"
sep

log "Pause 30s..."
sleep 30

# ─────────────────────────────────────────────────────────────────────────────
# Étape 3 — DVF historique 2020-2023
# ─────────────────────────────────────────────────────────────────────────────
log "[3/4] DVF historique 2020-2023 (4 CSV gzippés)"
T0=$(date +%s)
python3 /opt/stack/scripts/brh-ingest-dvf-historique.py 2>&1 | tail -8
T1=$(date +%s)
log "[3/4] terminé en $((T1-T0))s"
sep

log "Pause 60s avant BDNB (gros volume)..."
sleep 60

# ─────────────────────────────────────────────────────────────────────────────
# Étape 4 — BDNB Bretagne (4 pg_dump, conditionnel temps)
# ─────────────────────────────────────────────────────────────────────────────
log "[4/4] BDNB Bretagne — skip auto (à lancer manuellement après audit)"
log "  Script prêt : /opt/stack/scripts/brh-ingest-bdnb-bretagne.sh"
sep

log "🌙 NIGHT ORCHESTRATOR — terminé"
sep
