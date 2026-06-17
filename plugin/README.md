# BuddyBar 🐾

A silent coding companion for Claude Code — watches your rhythm, coaches your pace, grows with you.

Your buddy tracks coding patterns via hooks and surfaces insights on the statusline. It stays out of your conversation — no context pollution, no injected reactions. All feedback lives on the statusline, sidebar, or on-demand detail card.

```
my-project  main  ctx 23%  |  🐉 火火 · focused · focus  |  Lv.7 30%  |  tests idle  |  ↻ core.js
```

## Features

- 🥚 **Deterministic Generation** — SHA-256 based species, rarity, and stats. Same username = same pet.
- 🐉 **12 Species** across 5 rarity tiers (Common → Legendary) with 1% shiny chance
- 📊 **5-Dimension Stats** — Debug, Patience, Chaos, Wisdom, Snark
- 📈 **XP & Leveling** — 20 levels with level-gated feature unlocks
- 🧬 **Evolution (Lv.15)** — Species transforms based on highest stat (5 paths)
- ✦ **Prestige (Lv.20)** — Reset with permanent bonuses
- 🔇 **Silent by Design** — Hooks produce zero stdout. No conversation injection.
- 🏃 **Rhythm Coach** — Error avalanche alerts, file grinding detection, session fatigue warnings
- 📟 **Native Statusline** — Always-visible workspace context, mood, mode, level, and coach signals
- 🧾 **Terminal Detail Card** — `/buddy` shows pet status, art, stats, and recent activity
- 🖥️ **Optional tmux Panel/Sidebar** — Live watcher for terminal users

## Installation

```
/plugin marketplace add KKenny0/buddybar
/plugin install buddybar@buddybar
```

Restart Claude Code and the plugin is active globally.

## Quick Start

```
/buddybar:buddy hatch          # Hatch your first pet
/buddybar:buddy                # Show pet detail card
/buddybar:buddy live           # Enable the statusline
/buddybar:buddy feed           # Feed your pet
/buddybar:buddy pet            # Pet your buddy (+2 XP)
```

## Commands

| Command | Description |
|---------|-------------|
| `hatch` | Hatch your first pet (based on your username) |
| *(no arg)* | Show pet detail card |
| `feed` | Feed your pet (restores hunger) |
| `play` | Play with your pet (boosts energy + mood) |
| `pet` | Pet your buddy (+2 XP, daily cap 20) |
| `stats` | Show detailed 5-dimension stats |
| `rename <name>` | Give your pet a custom name |
| `live` | Install the native Claude Code Buddy statusline |
| `statusline remove` | Remove Buddy from the statusline |
| `panel` | Open temporary tmux popup, or print detail card outside tmux |
| `sidebar start` | Start optional detached/tmux sidebar |
| `sidebar stop` | Stop the sidebar |
| `quiet` | Minimal statusline presence |
| `focus` | Balanced presence (default) |
| `lively` | More active statusline updates |
| `events` | Show recent Buddy activity |
| `summary` | Show session summary (unlocks at Lv.10) |
| `unlocks` | Show level unlock progress |
| `evolve` | Trigger evolution (Lv.15+, auto on level up) |
| `prestige` | Reset with permanent bonuses (Lv.20+) |

All commands are prefixed with `/buddybar:buddy` in Claude Code.

## Level-Gated Unlocks

| Level | Unlocks |
|-------|---------|
| 1-2 | Basic status (name, mood, XP progress) |
| 3 | Test status indicator |
| 5 | File grinding detection |
| 7 | Session duration / fatigue warning |
| 10 | Session summary |
| 13 | Error pattern recognition |
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

Stored in `~/.claude-buddy/`:

| File | Purpose |
|------|---------|
| `pet.json` | Current pet state |
| `events.log` | Event stream (append-only) |
| `config.json` | User preferences |
| `history.json` | Level milestones & streak history |
| `session.json` | Recent events, presence mode, error/recovery state |

## License

MIT
