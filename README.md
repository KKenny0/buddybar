# BuddyBar 🐾

> A virtual pet statusline for Claude Code — watches your rhythm, coaches your pace, grows with you.

Your buddy tracks your coding patterns via Claude Code hooks and surfaces insights on the statusline. It stays out of your conversation — no context pollution, no injected reactions. All feedback lives on the statusline or on-demand detail card.

**Statusline (always visible in Claude Code):**
```
my-project main  |  📖🐉 focused ✦1  |  ctx 23% · ↻ core.js
```

| Segment | Example | What it shows |
|---------|---------|---------------|
| Workspace | `my-project main` | Project folder and git branch |
| Buddy | `📖🐉 focused ✦1` | Evolved avatar, mood, prestige cycle |
| Work signal | `ctx 23% · ↻ core.js` | Context usage and rhythm coach signals |

**On-demand detail card (`/buddy`):**
```
╭──────────────────────────────────────────────────────────────────╮
│ BuddyBar                                                         │
├──────────────────────────────────────────────────────────────────┤
│ 🐉 火火  Lv.7 rare  focus                                        │
│ XP ████░░░░░░░░░░░░ 25%   🤔 focused   streak 1d                 │
│ Energy ████████████ 80/100   Hunger ████░░░░░░ 40/100            │
│                                                                   │
│        /^\       "🐉 火火 跟着你的改动移动视线。"                   │
│     <  •_•  >→                                                    │
│    (   ~   )                                                      │
│     `-zzzz-´                                                      │
│                                                                   │
│ Debug 33   Patience 28   Chaos 46   Wisdom 60   Snark 38        │
╰──────────────────────────────────────────────────────────────────╯
```

## Features

- 🥚 **Deterministic Generation** — SHA-256 based species, rarity, and stats. Same username = same pet.
- 🐉 **12 Species** across 5 rarity tiers (Common → Legendary) with 1% shiny chance
- 📊 **5-Dimension Stats** — Debug, Patience, Chaos, Wisdom, Snark
- 📈 **XP & Leveling** — 20 levels with level-gated feature unlocks
- 🔇 **Silent by Design** — Hooks produce zero stdout. No additionalContext, no conversation injection.
- 🏃 **Rhythm Coach** — Error avalanche alerts, file grinding detection, session fatigue warnings
- 📟 **Native Statusline** — Always-visible workspace context, buddy avatar, mood, and coach signals
- 🧾 **Terminal Detail Card** — `/buddy` shows pet status, art, stats, and recent activity
- 💾 **Persistent State** — Global `~/.buddybar/` storage, survives sessions

## Installation

### One-line install (recommended)

In Claude Code, run:

```
/plugin marketplace add KKenny0/buddybar
/plugin install buddybar@buddybar
```

That's it. Restart Claude Code and the plugin is active globally.

### Update

When a new version is released, use CLI commands (not the marketplace UI — the UI's "update" button has a [known bug](https://github.com/anthropics/claude-code/issues/16866)):

```
/plugin marketplace update buddybar
/plugin update buddybar@buddybar
```

Then restart Claude Code to apply.

### Manual setup

```bash
git clone https://github.com/KKenny0/buddybar.git
claude --plugin-dir ./buddybar/plugin
```

### npm global

```bash
git clone https://github.com/KKenny0/buddybar.git
cd buddybar/plugin
npm link
```

## Usage

### In Claude Code

After installation, commands are prefixed with the plugin name:

| Command | Description |
|---------|-------------|
| `/buddybar:buddy hatch` | Hatch your first pet (based on your username) |
| `/buddybar:buddy` | Show pet detail card (level, XP, mood, stats, recent activity) |
| `/buddybar:buddy rename <name>` | Give your pet a name |
| `/buddybar:buddy statusline on` | Enable the Buddy statusline |
| `/buddybar:buddy statusline off` | Remove Buddy from the statusline |
| `/buddybar:buddy mode <quiet\|focus\|lively>` | Set Buddy presence mode |
| `/buddybar:buddy evolve` | Trigger evolution (Lv.15+, auto on level up) |
| `/buddybar:buddy prestige` | Reset with permanent bonuses (Lv.20+) |

### Hooks (automatic, silent)

No setup needed. Once installed, hooks fire automatically:

- **Session start** — Pet wakes up, state updated
- **After each tool use** — Pet state updated, coach signals computed
- **Session end** — Pet goes to sleep

All hooks produce **zero stdout** — no text is injected into your conversation with Claude.

### Level-Gated Unlocks

Your buddy grows with you. Higher levels unlock more statusline features:

| Level | Unlocks |
|-------|---------|
| 1-2 | Basic avatar and mood |
| 5 | File grinding detection |
| 7 | Session duration / fatigue warning |
| 15 | **Evolution** — avatar transforms based on highest stat |
| 20 | **Prestige** — reset to Lv.1 with permanent bonuses |

### Evolution System (Lv.15)

When your buddy reaches Lv.15, its avatar evolves based on its highest stat. Each stat maps to an evolution path:

| Highest Stat | Path | Avatar | Art Effect |
|-------------|------|--------|------------|
| Debug | Valor | `⚔️🐉` | ⚔ Sword indicators |
| Patience | Zen | `🪷🐉` | ≋ Serene aura |
| Chaos | Storm | `⚡🐉` | ⚡ Electric sparks |
| Wisdom | Sage | `📖🐉` | ✧ Wisdom glow |
| Snark | Rogue | `🎭🐉` | ◇ Shadow wisps |

Evolution changes the statusline avatar (for example, `🐉` → `📖🐉`), applies visual art modifiers in the detail card, and grants +10 to all stats. Evolution is automatic on reaching Lv.15 — triggered via `addXp()`.

### Prestige System (Lv.20)

At Lv.20 (max level), you can prestige:

```
/buddybar:buddy prestige
```

Prestige resets your level to 1 while keeping:
- Your evolved form (if you evolved at Lv.15)
- Your species and rarity
- Your stats (plus +5 permanent bonus per prestige cycle)

Your level display changes to `Lv.X+N` where N is your prestige count. The statusline shows ✦ for each prestige cycle. There is no cap on prestige cycles — you can keep going.

### Rhythm Coach Signals

These appear on the statusline based on your coding patterns:

| Signal | Meaning | Unlocks |
|--------|---------|---------|
| `×3` | Consecutive errors — consider stepping back | always |
| `↻ filename` | Same file edited repeatedly — in a grind | Lv.5 |
| `⏰ 2h` | Session running long — take a break | Lv.7 |

### Presence Surfaces

**Statusline (primary):**
```
/buddybar:buddy statusline on
```
Compact always-visible line: workspace context, mood, level, XP%, coach signals.

**On-demand detail card:**
```
/buddybar:buddy
```

## Species

| Species | Min Rarity | Emoji |
|---------|-----------|-------|
| Cat | Common | 🐱 |
| Duck | Common | 🦆 |
| Ghost | Common | 👻 |
| Robot | Common | 🤖 |
| Slime | Common | 🟢 |
| Dragon | Uncommon | 🐉 |
| Owl | Uncommon | 🦉 |
| Penguin | Uncommon | 🐧 |
| Fox | Rare | 🦊 |
| Axolotl | Rare | 🦎 |
| Phoenix | Epic | 🔥 |
| Capybara | Legendary | 🫎 |

## Rarity System

| Rarity | Chance | Stat Floor | Hat | Special |
|--------|--------|------------|-----|---------|
| Common | 60% | 5 | ❌ | — |
| Uncommon | 25% | 15 | ✅ | Unique color |
| Rare | 10% | 25 | ✅ | Personality trait |
| Epic | 4% | 35 | ✅ | Special ability |
| Legendary | 1% | 50 | ✅ | Unique evolution |

Plus a **1% chance of being Shiny** ✨

## XP Sources

| Source | Amount | Cap |
|--------|--------|-----|
| Session start (daily) | +10 | 1x/day |
| Git commit | +5 | uncapped |
| Every 10 tool uses | +1 | uncapped |
| Streak bonus | +5 × streak | resets on miss |
| Error recovery | +3 | uncapped |

## Data

All data stored in `~/.buddybar/`:

| File | Purpose |
|------|---------|
| `pet.json` | Current pet state |
| `events.log` | Event stream (append-only) |
| `config.json` | User preferences |
| `history.json` | Level milestones & streak history |
| `session.json` | Recent events, presence mode, error/recovery state |

## Architecture

```
┌─────────────────────────────────────┐
│           Claude Code               │
│                                     │
│  Hooks ──▶ pet/session state files  │
│  (silent)     + events.log          │
│                                     │
│  /buddy ──▶ buddy-core ──▶ card     │
│  statusLine ────────────▶ one line  │
│                                     │
│  ✗ no stdout from hooks             │
│  ✗ no additionalContext injection   │
└─────────────────────────────────────┘
```

## Troubleshooting

**Plugin won't update?**

The marketplace UI's "update" button may not work due to a [known Claude Code bug](https://github.com/anthropics/claude-code/issues/16866). Use CLI commands instead:

```
/plugin marketplace update buddybar
/plugin update buddybar@buddybar
```

If that still fails, do a clean reinstall:

```bash
rm -rf ~/.claude/plugins/cache/buddybar
/plugin marketplace remove buddybar
/plugin marketplace add KKenny0/buddybar
/plugin install buddybar@buddybar
```

**`/buddybar:buddy` says "Unknown skill"?**
Plugin not installed. Run the installation commands above.

**Buddy seems quiet?**
That's intentional. All feedback lives on the statusline and on-demand card. Hooks don't inject text into conversation. Run `/buddybar:buddy statusline on` to enable the statusline.

## License

MIT
