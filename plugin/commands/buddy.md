---
description: Manage BuddyBar pet status, statusline, panel, sidebar, and presence mode
argument-hint: "[status|hatch|feed|play|pet|stats|rename NAME|live|statusline install|statusline remove|panel|sidebar start|sidebar stop|quiet|focus|lively|events|summary|unlocks|evolve|prestige|doctor|check]"
allowed-tools: Bash(node:*)
---

Run BuddyBar exactly once with the provided arguments, then return the command output verbatim.

Do not summarize, translate, reinterpret, or replace the output with a pet reaction. Preserve terminal cards, ANSI color, line breaks, and command messages exactly as printed.

!`node "${CLAUDE_PLUGIN_ROOT}/src/bin/buddy-core.js" $ARGUMENTS`
