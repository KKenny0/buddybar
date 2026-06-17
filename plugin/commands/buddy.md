---
description: Manage BuddyBar pet status, statusline, mode, evolution, prestige, and self-check
argument-hint: "[status|hatch|rename NAME|statusline on|statusline off|mode MODE|quiet|focus|lively|evolve|prestige|doctor|check]"
allowed-tools: Bash(node:*)
---

Run BuddyBar exactly once with the provided arguments, then return the command output verbatim.

Do not summarize, translate, reinterpret, or replace the output with a pet reaction. Preserve terminal cards, ANSI color, line breaks, and command messages exactly as printed.

!`node "${CLAUDE_PLUGIN_ROOT}/src/bin/buddy-core.js" $ARGUMENTS`
