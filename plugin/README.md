# BuddyBar 🐾

A silent coding companion for Claude Code — watches your rhythm, coaches your pace, grows with you.

Your buddy tracks coding patterns via hooks and surfaces insights on the statusline. It stays out of your conversation — no context pollution, no injected reactions. All feedback lives on the statusline or on-demand detail card.

```
my-project main  |  📖🐉 focused ✦1  |  ctx 23% · ↻ core.js
```

## Features

- 🥚 **Deterministic Generation** — SHA-256 based species, rarity, and stats. Same username = same pet.
- 🐉 **12 Species** across 5 rarity tiers (Common → Legendary) with 1% shiny chance
- 📊 **5-Dimension Stats** — Debug, Patience, Chaos, Wisdom, Snark
- 📈 **XP & Leveling** — 20 levels with level-gated feature unlocks
- 🧬 **Evolution (Lv.15)** — Avatar changes based on highest stat (5 paths)
- ✦ **Prestige (Lv.20)** — Reset with permanent bonuses
- 🔇 **Silent by Design** — Hooks produce zero stdout. No conversation injection.
- 🏃 **Rhythm Coach** — Error avalanche alerts, file grinding detection, session fatigue warnings
- 📟 **Native Statusline** — Always-visible workspace context, buddy avatar, mood, and coach signals
- 🧾 **Terminal Detail Card** — `/buddy` shows pet status, art, stats, and recent activity

## Installation

From your terminal, run:

```bash
claude plugin marketplace add KKenny0/buddybar
claude plugin install buddybar@buddybar
```

Restart Claude Code and the plugin is active globally.

## Quick Start

```
/buddybar:buddy hatch          # Hatch your first pet
/buddybar:buddy                # Show pet detail card
/buddybar:buddy statusline on  # Enable the statusline
/buddybar:buddy doctor         # Check install health
```

## Commands

| Command | Description |
|---------|-------------|
| `hatch` | Hatch your first pet (based on your username) |
| *(no arg)* | Show pet detail card |
| `rename <name>` | Give your pet a custom name |
| `statusline on` | Install the native Claude Code Buddy statusline |
| `statusline off` | Remove Buddy from the statusline |
| `mode <quiet\|focus\|lively>` | Set statusline presence mode |
| `quiet` / `focus` / `lively` | Hidden shortcuts for presence mode |
| `evolve` | Trigger evolution (Lv.15+, auto on level up) |
| `prestige` | Reset with permanent bonuses (Lv.20+) |
| `doctor` / `check` | Check install, statusline, and update identity |

All commands are prefixed with `/buddybar:buddy` in Claude Code.

## Level-Gated Unlocks

| Level | Unlocks |
|-------|---------|
| 1-2 | Basic avatar and mood |
| 5 | File grinding detection |
| 7 | Session duration / fatigue warning |
| 15 | **Evolution** — avatar transforms |
| 20 | **Prestige** — reset with bonuses |

## Evolution Paths (Lv.15)

Your buddy's avatar evolves based on its highest stat:

| Highest Stat | Path | Avatar |
|-------------|------|--------|
| Debug | Valor | `⚔️🐉` |
| Patience | Zen | `🪷🐉` |
| Chaos | Storm | `⚡🐉` |
| Wisdom | Sage | `📖🐉` |
| Snark | Rogue | `🎭🐉` |

## Hooks (automatic, silent)

No setup needed. Once installed, hooks fire automatically:

- **Session start** — Pet wakes up, state updated
- **After each tool use** — Pet state updated, coach signals computed
- **Session end** — Pet goes to sleep

All hooks produce **zero stdout** — no text is injected into your conversation.

## Data

Stored in `~/.buddybar/`:

| File | Purpose |
|------|---------|
| `pet.json` | Current pet state |
| `events.log` | Event stream (append-only) |
| `config.json` | User preferences |
| `history.json` | Level milestones & streak history |
| `session.json` | Recent events, presence mode, error/recovery state |

## Architecture

BuddyBar keeps the compact statusline renderer separate from CLI-specific input parsing. Claude Code uses the default adapter today; the generic adapter gives other CLIs a stable place to map their cwd, branch, and context usage into the same renderer.

## License

MIT
