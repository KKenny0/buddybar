const { EVOLUTION_PATHS } = require('./data/species');

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

const UNLOCKS = {
  fileFocus: 5,
  sessionDuration: 7,
  evolution: 15,
  prestige: 20,
};

function unlocked(level, feature) {
  return level >= (UNLOCKS[feature] || 0);
}

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
    if (count >= threshold) return file.split(/[\\/]/).pop();
  }
  return null;
}

function formatDuration(min) {
  if (min < 60) return `${Math.round(min)}m`;
  return `${Math.floor(min / 60)}h${Math.round(min % 60)}m`;
}

function errorThreshold(stats) {
  const debug = stats?.debug ?? 50;
  return Math.max(2, Math.round(3 - (debug - 50) / 50));
}

function grindingThreshold(stats) {
  const patience = stats?.patience ?? 50;
  return Math.max(3, Math.round(5 + (patience - 50) / 20));
}

function fatigueThresholdMin(stats) {
  const wisdom = stats?.wisdom ?? 50;
  const shift = Math.round((wisdom - 50) / 5);
  return {
    yellow: Math.max(30, 60 - shift),
    red: Math.max(60, 120 - shift),
  };
}

function colorForMood(mood) {
  if (mood === 'happy' || mood === 'excited') return c.green;
  if (mood === 'worried' || mood === 'hungry') return c.red;
  if (mood === 'sleepy') return c.yellow;
  return c.cyan;
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

function joinSignalParts(parts) {
  return parts.filter(Boolean).join(`${c.dim} · ${c.reset}`);
}

function buildSegments(pet, session, mode, wsInfo) {
  const segs = [];
  const prestige = pet.prestige || 0;

  const workspaceParts = [];
  if (wsInfo.folder) workspaceParts.push(wsInfo.folder);
  if (wsInfo.branch) workspaceParts.push(wsInfo.branch);
  if (workspaceParts.length > 0) {
    segs.push(`${c.dim}${workspaceParts.join(' ')}${c.reset}`);
  }

  const prestigeTag = prestige > 0 ? `${c.brightYellow} ✦${prestige}${c.reset}` : '';
  segs.push(`${evolvedAvatar(pet)} ${colorForMood(pet.mood)}${pet.mood}${c.reset}${prestigeTag}`);

  const signals = [];
  const ctxColor = contextWindowColor(wsInfo.ctxPct);
  if (ctxColor) {
    const pctStr = wsInfo.ctxPct != null ? `${Math.round(wsInfo.ctxPct)}%` : '--';
    signals.push(`${ctxColor}ctx ${pctStr}${c.reset}`);
  }

  const errThresh = errorThreshold(pet.stats);
  if ((session.consecutiveErrors || 0) >= errThresh) {
    signals.push(`${c.red}\u00d7${session.consecutiveErrors}${c.reset}`);
  }

  if (unlocked(pet.level, 'fileFocus')) {
    const grinding = grindingFile(session, grindingThreshold(pet.stats));
    if (grinding) signals.push(`${c.yellow}\u21bb ${grinding}${c.reset}`);
  }

  if (unlocked(pet.level, 'sessionDuration')) {
    const dur = sessionDurationMin(session);
    const fatigue = fatigueThresholdMin(pet.stats);
    if (dur >= fatigue.red) {
      signals.push(`${c.red}\u23f0 ${formatDuration(dur)}${c.reset}`);
    } else if (dur >= fatigue.yellow) {
      signals.push(`${c.yellow}${formatDuration(dur)}${c.reset}`);
    }
  }

  if (signals.length > 0) {
    segs.push(joinSignalParts(signals));
  }

  return segs;
}

function renderStatusline(pet, session, mode, wsInfo) {
  return buildSegments(pet, session, mode, wsInfo).join(` ${c.dim}|${c.reset} `);
}

module.exports = {
  colors: c,
  errorThreshold,
  grindingThreshold,
  fatigueThresholdMin,
  grindingFile,
  contextWindowColor,
  evolvedAvatar,
  joinSignalParts,
  buildSegments,
  renderStatusline,
};
