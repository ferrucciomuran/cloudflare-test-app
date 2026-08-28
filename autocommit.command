#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
#  autocommit.command — Auto Git Watcher per Cloudflare Pages
#  • Doppio click su macOS per avviare in Terminal
#  • Monitora src/ con fswatch + debounce, poi git add → commit → push
#  • Il log viene stampato in tempo reale nella finestra del Terminal
#  • Chiudere la finestra (o Ctrl+C) arresta tutto in sicurezza
# ═══════════════════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/autocommit.log"
WATCH_DIR="$SCRIPT_DIR/src"
BRANCH="main"
DEBOUNCE=4

# ── Colori ANSI ───────────────────────────────────────────────────────────────
R='\033[0;31m'; G='\033[0;32m'; Y='\033[1;33m'
B='\033[0;34m'; C='\033[0;36m'; W='\033[1;37m'; N='\033[0m'

log() {
  local ts; ts="$(date '+%Y-%m-%d %H:%M:%S')"
  local msg="[$ts] $*"
  echo -e "$msg"
  echo "$msg" >> "$LOG_FILE"
}

# ── Cleanup al SIGINT / SIGTERM (chiusura finestra o Ctrl+C) ──────────────────
cleanup() {
  echo ""
  log "${Y}⏹  Watcher arrestato — chiusura in corso...${N}"
  [[ -n "$FSWATCH_PID" ]] && kill "$FSWATCH_PID" 2>/dev/null
  [[ -n "$TIMER_PID"   ]] && kill "$TIMER_PID"   2>/dev/null
  log "─────────────────────────────────────────"
  exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# ── Verifica dipendenze ───────────────────────────────────────────────────────
if ! command -v fswatch &>/dev/null; then
  echo -e "${R}[ERROR] fswatch non trovato.${N}"
  echo -e "  Installalo con: ${W}brew install fswatch${N}"
  read -r -p "Premi Invio per chiudere..."
  exit 1
fi

if ! git -C "$SCRIPT_DIR" rev-parse --is-inside-work-tree &>/dev/null; then
  echo -e "${R}[ERROR] La directory non è un repository Git.${N}"
  read -r -p "Premi Invio per chiudere..."
  exit 1
fi

# ── Banner ────────────────────────────────────────────────────────────────────
clear
echo -e "${C}"
echo "  ╔══════════════════════════════════════════════════╗"
echo "  ║        🚀  Auto Git Watcher — CF Pages           ║"
echo "  ║  Monitora src/ · debounce ${DEBOUNCE}s · push → ${BRANCH}        ║"
echo "  ║  Chiudi questa finestra per arrestare il watch   ║"
echo "  ╚══════════════════════════════════════════════════╝"
echo -e "${N}"
log "${G}▶  Watcher avviato${N}  |  dir: ${WATCH_DIR}"
log "   Log anche su: ${LOG_FILE}"
echo ""

# ── Funzione commit & push ────────────────────────────────────────────────────
do_commit_push() {
  log "${B}⚡  Modifiche rilevate — avvio git flow...${N}"

  cd "$SCRIPT_DIR" || return

  git add . 2>&1 | while IFS= read -r line; do log "   git add  | $line"; done

  if git diff --cached --quiet; then
    log "${Y}ℹ  Nessuna modifica staged — commit saltato.${N}"
    return
  fi

  local ts; ts="$(date '+%Y-%m-%d %H:%M:%S')"
  local msg="Auto-deploy: $ts"

  if git commit -m "$msg" 2>&1 | while IFS= read -r line; do log "   commit   | $line"; done; then
    log "${G}✔  Commit eseguito:${N} \"$msg\""
  fi

  if git push origin "$BRANCH" 2>&1 | while IFS= read -r line; do log "   push     | $line"; done; then
    log "${G}✓  Push completato su origin/${BRANCH}${N}"
  else
    log "${R}✗  Push fallito — verifica le credenziali Git / connessione${N}"
  fi

  echo ""
}

# ── fswatch loop ──────────────────────────────────────────────────────────────
TIMER_PID=""
FSWATCH_PID=""

fswatch \
  --recursive \
  --latency 1 \
  --exclude '\.git' \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude '\.DS_Store' \
  "$WATCH_DIR" | while IFS= read -r event; do

    log "${Y}📁  File modificato:${N} ${event##*/}"

    # Debounce: cancella timer precedente, ne avvia uno nuovo
    if [[ -n "$TIMER_PID" ]] && kill -0 "$TIMER_PID" 2>/dev/null; then
      kill "$TIMER_PID" 2>/dev/null
    fi

    (sleep "$DEBOUNCE" && do_commit_push) &
    TIMER_PID=$!

  done &

FSWATCH_PID=$!

# ── Mantieni il terminale aperto ──────────────────────────────────────────────
wait "$FSWATCH_PID"
