#!/bin/bash
# BuddyBar — post-tool-use hook
# Fires after Claude uses any tool. Updates pet state and reactions.
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

JSON_NODE=""
if command -v node.exe >/dev/null 2>&1 && command -v wslpath >/dev/null 2>&1; then
  JSON_NODE="node.exe"
elif command -v node >/dev/null 2>&1; then
  JSON_NODE="node"
fi

# Only proceed if pet exists
PET_JSON="$BUDDY_HOME/pet.json"
[ ! -f "$PET_JSON" ] && exit 0

# Read tool info from stdin (Claude Code passes tool info via stdin JSON)
INPUT=""
if [ ! -t 0 ]; then
  INPUT=$(cat 2>/dev/null || echo "")
fi

# Extract tool name
TOOL_NAME=""
TOOL_FILE=""
TOOL_COMMAND=""
HOOK_EXIT_CODE=""
if [ -n "$INPUT" ] && [ -n "$JSON_NODE" ]; then
  TOOL_NAME=$(echo "$INPUT" | "$JSON_NODE" -e "
    let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
      try{const j=JSON.parse(d);console.log(j.tool_name||j.tool||'')}catch(e){console.log('')}
    })" 2>/dev/null || true)
  TOOL_FILE=$(echo "$INPUT" | "$JSON_NODE" -e "
    let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
      try{const j=JSON.parse(d);const i=j.tool_input||j.input||{};console.log(j.file_path||j.file||j.path||i.file_path||i.file||i.path||'')}catch(e){console.log('')}
    })" 2>/dev/null || true)
  TOOL_COMMAND=$(echo "$INPUT" | "$JSON_NODE" -e "
    let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
      try{const j=JSON.parse(d);const i=j.tool_input||j.input||{};console.log(i.command||j.command||'')}catch(e){console.log('')}
    })" 2>/dev/null || true)
  HOOK_EXIT_CODE=$(echo "$INPUT" | "$JSON_NODE" -e "
    let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
      try{const j=JSON.parse(d);const r=j.tool_response||j.response||{};console.log(j.exit_code??r.exit_code??'')}catch(e){console.log('')}
    })" 2>/dev/null || true)
fi

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

if [ -n "$TOOL_NAME" ] && { [ -n "$BUDDY_NODE" ] || [ -n "${BUDDY_CORE:-}" ]; }; then
  TOOL_EXIT_CODE="${TOOL_EXIT_CODE:-${HOOK_EXIT_CODE:-0}}"
  export TOOL_EXIT_CODE
  if [ -n "$BUDDY_NODE" ]; then
    BUDDYBAR_HOME_FOR_NODE="$BUDDYBAR_HOME"
    if [ "$BUDDY_NODE" = "node.exe" ] && [ -n "${BUDDYBAR_HOME_WIN:-}" ]; then
      BUDDYBAR_HOME_FOR_NODE="$BUDDYBAR_HOME_WIN"
    fi
    BUDDY_RESULT=$(BUDDYBAR_HOME="$BUDDYBAR_HOME_FOR_NODE" "$BUDDY_NODE" "$BUDDY_SCRIPT" tool-use "$TOOL_NAME" "$TOOL_FILE" "$TOOL_COMMAND" --json 2>/dev/null || true)
  else
    BUDDY_RESULT=$("$BUDDY_CORE" tool-use "$TOOL_NAME" "$TOOL_FILE" "$TOOL_COMMAND" --json 2>/dev/null || true)
  fi
fi

# No stdout output — buddy reactions are shown on statusline/sidebar only.
# PostToolUse hook stdout gets injected as additionalContext into the agent,
# so we intentionally output nothing to avoid polluting the agent's context.
