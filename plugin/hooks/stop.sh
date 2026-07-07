#!/bin/bash
# BuddyBar — stop hook
# Fires when a Claude Code session ends. The pet goes to sleep.
# Produces no stdout — all feedback goes to statusline/sidebar.

set -euo pipefail

PLUGIN_DIR="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"

configure_buddy_home() {
  BUDDYBAR_HOME_WIN=""

  if command -v wslpath >/dev/null 2>&1 && command -v cmd.exe >/dev/null 2>&1; then
    WIN_HOME="$(cmd.exe /c echo %USERPROFILE% </dev/null 2>/dev/null | tr -d '\r')"
    if [ -n "$WIN_HOME" ] && [ "$WIN_HOME" != "%USERPROFILE%" ]; then
      BUDDY_HOME="$(wslpath -u "$WIN_HOME")/.buddybar"
      BUDDYBAR_HOME_WIN="$WIN_HOME\\.buddybar"
      export BUDDYBAR_HOME="$BUDDY_HOME"
      return
    fi
  fi

  BUDDY_HOME="${BUDDYBAR_HOME:-$HOME/.buddybar}"
  export BUDDYBAR_HOME="$BUDDY_HOME"
}

configure_buddy_home

PET_JSON="$BUDDY_HOME/pet.json"
[ ! -f "$PET_JSON" ] && exit 0

# Find buddy-core — prefer local plugin copy over global install
BUDDY_NODE=""
BUDDY_SCRIPT=""
if [ -f "$PLUGIN_DIR/src/bin/buddy-core.js" ]; then
  if command -v node.exe >/dev/null 2>&1 && command -v wslpath >/dev/null 2>&1; then
    BUDDY_NODE="node.exe"
    BUDDY_SCRIPT="$(wslpath -w "$PLUGIN_DIR/src/bin/buddy-core.js")"
  elif command -v node >/dev/null 2>&1; then
    BUDDY_NODE="node"
    BUDDY_SCRIPT="$PLUGIN_DIR/src/bin/buddy-core.js"
  fi
elif command -v buddy-core &>/dev/null; then
  BUDDY_CORE="buddy-core"
fi

if [ -n "$BUDDY_NODE" ]; then
  BUDDYBAR_HOME_FOR_NODE="$BUDDYBAR_HOME"
  if [ "$BUDDY_NODE" = "node.exe" ] && [ -n "${BUDDYBAR_HOME_WIN:-}" ]; then
    BUDDYBAR_HOME_FOR_NODE="$BUDDYBAR_HOME_WIN"
  fi
  BUDDY_RESULT=$(BUDDYBAR_HOME="$BUDDYBAR_HOME_FOR_NODE" "$BUDDY_NODE" "$BUDDY_SCRIPT" session-stop --json 2>/dev/null || true)
elif [ -n "${BUDDY_CORE:-}" ]; then
  BUDDY_RESULT=$("$BUDDY_CORE" session-stop --json 2>/dev/null || true)
fi

# No stdout output — buddy state is shown on statusline/sidebar only.
# Stop hook stdout gets injected as additionalContext into the agent,
# so we intentionally output nothing to avoid polluting the agent's context.

# Reset reaction counter for next session
rm -f "$BUDDY_HOME/.react-counter" 2>/dev/null || true
