#!/usr/bin/env node
/**
 * buddy-statusline — Claude Code statusline segment.
 * Shows pet state, rhythm coach signals, and level-gated features.
 * All output is purely visual — nothing is injected into conversation context.
 */

const { execSync } = require('child_process');
const path = require('path');
const { getOrCreatePet } = require('../core');
const { ensureSetup, readSession, readConfig } = require('../storage');
const { EVOLUTION_PATHS } = require('../data/species');

const ESC = '\x1b[';
const c = {
  reset: `${ESC}0m`,
  dim: `${ESC}90m`,
  cyan: `${ESC}36m`,
  green: `${ESC}32m`,
  yellow: `${ESC}33m`,
  red: `${ESC}31m`,
  blue: `${ESC}34m`,
  magenta: `${ESC}35m`,
  brightYellow: `${ESC}93m`,
};

// --- Level-gated unlock system ---
const UNLOCKS = {
  fileFocus: 5,
  sessionDuration: 7,
  evolution: 15,
  prestige: 20,
};

function unlocked(level, feature) {
  return level >= (UNLOCKS[feature] || 0);
}

// --- Rhythm coach signals ---

function sessionDurationMin(session) {
  if (!session.lastActivityAt) return 0;
  const first = session.recentTools?.[0]?.timestamp;
  if (!first) return 0;
  return (Date.now() - Date.parse(first)) / 60000;
}

function grindingFile(session, threshold = 5) {
  if (!session.recentTools) return null;
  const counts = {};
  for (const t of session.recentTools) {
    if (t.file && ['edit', 'multiedit', 'write'].includes(String(t.tool).toLowerCase())) {
      counts[t.file] = (counts[t.file] || 0) + 1;
    }
  }
  for (const [file, count] of Object.entries(counts)) {
    if (count >= threshold) return file.split('/').pop();
  }
  return null;
}

function formatDuration(min) {
  if (min < 60) return `${Math.round(min)}m`;
  return `${Math.floor(min / 60)}h${Math.round(min % 60)}m`;
}

// --- Stat-influenced thresholds ---

function errorThreshold(stats) {
  // Base: 3 consecutive errors. Higher Debug → detects earlier → lower threshold. Range: 2–4
  const debug = stats?.debug ?? 50;
  return Math.max(2, Math.round(3 - (debug - 50) / 50));
}

function grindingThreshold(stats) {
  // Base: 5 same-file edits. Higher Patience → tolerates more grinding. Range: 3–8
  const patience = stats?.patience ?? 50;
  return Math.max(3, Math.round(5 + (patience - 50) / 20));
}

function fatigueThresholdMin(stats) {
  // Base: yellow at 60min, red at 120min. Higher Wisdom → alerts earlier. Shift range: ±10min
  const wisdom = stats?.wisdom ?? 50;
  const shift = Math.round((wisdom - 50) / 5);
  return {
    yellow: Math.max(30, 60 - shift),
    red: Math.max(60, 120 - shift),
  };
}

// --- Statusline rendering ---

function readStdinJson() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => {
      if (!data.trim()) { resolve({}); return; }
      try { resolve(JSON.parse(data)); } catch { resolve({}); }
    });
    setTimeout(() => resolve({}), 40);
  });
}

function colorForMood(mood) {
  if (mood === 'happy' || mood === 'excited') return c.green;
  if (mood === 'worried' || mood === 'hungry') return c.red;
  if (mood === 'sleepy') return c.yellow;
  return c.cyan;
}

function resolveBranch(ctx) {
  if (ctx.workspace?.git_worktree) return ctx.workspace.git_worktree;
  try {
    return execSync('git branch --show-current', {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 2000
    }).trim() || null;
  } catch { return null; }
}

function contextWindowColor(pct) {
  if (pct == null) return null;
  if (pct > 80) return c.red;
  if (pct > 50) return c.yellow;
  return c.dim;
}

function evolvedAvatar(pet) {
  const speciesEmoji = pet?.speciesEmoji || '🐾';
  if (!pet?.evolutionPath) return speciesEmoji;

  const path = Object.values(EVOLUTION_PATHS).find(p => p.id === pet.evolutionPath);
  return path?.emoji ? `${path.emoji}${speciesEmoji}` : speciesEmoji;
}

function buildSegments(pet, session, mode, wsInfo) {
  const segs = [];
  const prestige = pet.prestige || 0;

  // Workspace context — dim layer, always shown
  if (wsInfo.folder) {
    segs.push(`${c.dim}${wsInfo.folder}${c.reset}`);
  }
  if (wsInfo.branch) {
    segs.push(`${c.dim}${wsInfo.branch}${c.reset}`);
  }
  const ctxColor = contextWindowColor(wsInfo.ctxPct);
  if (ctxColor) {
    const pctStr = wsInfo.ctxPct != null ? `${Math.round(wsInfo.ctxPct)}%` : '--';
    segs.push(`${ctxColor}ctx${c.reset} ${ctxColor}${pctStr}${c.reset}`);
  }

  // Pet state: compact avatar + current mood. Details live in /buddy.
  const prestigeTag = prestige > 0 ? `${c.brightYellow} ✦${prestige}${c.reset}` : '';
  segs.push(
    `${evolvedAvatar(pet)} ${colorForMood(pet.mood)}${pet.mood}${c.reset}${prestigeTag}`
  );

  // Coach: error avalanche (always shown — critical signal)
  const errThresh = errorThreshold(pet.stats);
  if ((session.consecutiveErrors || 0) >= errThresh) {
    segs.push(`${c.red}\u00d7${session.consecutiveErrors}${c.reset}`);
  }

  // Level 5+: file focus grinding
  if (unlocked(pet.level, 'fileFocus')) {
    const grinding = grindingFile(session, grindingThreshold(pet.stats));
    if (grinding) {
      segs.push(`${c.yellow}\u21bb ${grinding}${c.reset}`);
    }
  }

  // Level 7+: session duration / fatigue
  if (unlocked(pet.level, 'sessionDuration')) {
    const dur = sessionDurationMin(session);
    const fatigue = fatigueThresholdMin(pet.stats);
    if (dur >= fatigue.red) {
      segs.push(`${c.red}\u23f0 ${formatDuration(dur)}${c.reset}`);
    } else if (dur >= fatigue.yellow) {
      segs.push(`${c.yellow}${formatDuration(dur)}${c.reset}`);
    }
  }

  return segs;
}

async function main() {
  ensureSetup();
  const ctx = await readStdinJson();

  const config = readConfig();
  const session = readSession();
  const mode = session.mode || config.liveMode || 'focus';
  const pet = getOrCreatePet(process.env.USER || 'anonymous');

  const wsInfo = {
    folder: ctx.cwd ? path.basename(ctx.cwd) : null,
    branch: resolveBranch(ctx),
    ctxPct: ctx.context_window?.used_percentage ?? null,
  };

  if (!pet) {
    // Pet data unavailable (corrupted or locked). Show minimal statusline.
    const folder = wsInfo.folder || '';
    const branch = wsInfo.branch || '';
    const parts = [folder, branch].filter(Boolean);
    if (parts.length) {
      process.stdout.write(`${c.dim}${parts.join(' · ')}${c.reset}`);
    } else {
      process.stdout.write(`${c.dim}buddy${c.reset}`);
    }
    return;
  }

  const line = buildSegments(pet, session, mode, wsInfo).join(` ${c.dim}|${c.reset} `);
  process.stdout.write(line);
}

main().catch(() => {
  process.stdout.write('buddy: unavailable');
});

// Export for testing
if (typeof module !== 'undefined') {
  module.exports = { errorThreshold, grindingThreshold, fatigueThresholdMin, grindingFile, contextWindowColor, resolveBranch, evolvedAvatar };
}
