/**
 * Pet generation and management logic.
 * Handles species generation, stats, XP/leveling, and state updates.
 */

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { SPECIES, NAME_SUGGESTIONS, HATS, getEvolutionPath, getEvolvedName } = require('./data/species');
const {
  ensureSetup,
  getBuddyHome,
  readPet,
  writePet,
  logEvent,
  appendHistory,
  readConfig,
  writeConfig,
  readSession,
  writeSession,
  rememberSessionEvent,
} = require('./storage');

/** XP required for each level (index = level, value = total XP needed) */
const LEVEL_XP = {
  1: 0, 2: 20, 3: 50, 4: 80, 5: 100,
  6: 140, 7: 180, 8: 220, 9: 260, 10: 300,
  11: 350, 12: 400, 13: 460, 14: 520, 15: 600,
  16: 680, 17: 760, 18: 850, 19: 950, 20: 1000,
};

/** Get total XP needed for a level */
function xpForLevel(level) {
  return LEVEL_XP[Math.min(level, 20)] ?? 1000;
}

/** Get XP needed from current level to next */
function xpToNextLevel(level) {
  if (level >= 20) return 0;
  return xpForLevel(level + 1) - xpForLevel(level);
}

function normalizeMode(mode) {
  return ['quiet', 'focus', 'lively'].includes(mode) ? mode : 'focus';
}

function getLiveMode() {
  const config = readConfig();
  const session = readSession();
  return normalizeMode(session.mode || config.liveMode);
}

function setLiveMode(mode) {
  const nextMode = normalizeMode(mode);
  const config = readConfig();
  config.liveMode = nextMode;
  writeConfig(config);

  const session = readSession();
  session.mode = nextMode;
  writeSession(session);
  return nextMode;
}

function createReaction(pet, text, mood, priority, mode, ttlMs = 8000) {
  return {
    text,
    mood,
    priority,
    surface: ['live'],
    ttlMs,
    timestamp: new Date().toISOString(),
  };
}

function isTestCommand(command) {
  return /\b(test|tests|pytest|vitest|jest|mocha|npm\s+test|pnpm\s+test|yarn\s+test|cargo\s+test|go\s+test)\b/i.test(command || '');
}

function isCheckCommand(command) {
  return /\b(check|lint|typecheck|tsc|build)\b/i.test(command || '');
}

function rememberEvent(event) {
  const session = readSession();
  const summary = {
    type: event.type,
    tool: event.tool,
    file: event.file,
    text: event.reaction?.text || event.message || '',
    mood: event.reaction?.mood,
    priority: event.reaction?.priority || event.importance,
    timestamp: event.timestamp,
  };
  writeSession(rememberSessionEvent(session, summary));
  logEvent(event);
}

function updateSessionForTool(session, tool, file, command, failed) {
  const now = new Date().toISOString();
  const next = { ...session };
  next.lastActivityAt = now;
  next.recentTools = Array.isArray(next.recentTools) ? next.recentTools : [];
  next.recentTools.push({ tool, file, command, failed, timestamp: now });
  next.recentTools = next.recentTools.slice(-20);

  if (failed) {
    next.consecutiveErrors = (next.consecutiveErrors || 0) + 1;
    next.lastFailureAt = now;
  } else if ((next.consecutiveErrors || 0) > 0) {
    next.lastRecoveryAt = now;
    next.consecutiveErrors = 0;
  }

  if (file) {
    const recentSameFile = next.recentTools.filter((item) => item.file && item.file === file).length;
    if (recentSameFile >= 5) {
      next.currentTask = `Working around ${file}`;
    }
  }

  if (isTestCommand(command)) {
    next.lastTestStatus = failed ? 'red' : 'green';
    next.lastTestAt = now;
  }

  return next;
}

function reactionForTool(pet, tool, file, command, failed, recovered, mode) {
  const name = pet.name;
  const emoji = pet.speciesEmoji;
  const lowerTool = String(tool || '').toLowerCase();

  if (failed) {
    const critical = lowerTool === 'bash' || lowerTool === 'shell';
    return createReaction(
      pet,
      critical
        ? `${emoji} ${name} 盯着失败的命令，轻轻提醒你先看最后几行输出。`
        : `${emoji} ${name} 注意到刚才的操作失败了，先稳住节奏。`,
      'worried',
      critical ? 'critical' : 'important',
      mode,
      10000,
    );
  }

  if (recovered) {
    return createReaction(pet, `${emoji} ${name} 看到你从错误里恢复过来，放松地晃了晃。`, 'happy', 'important', mode);
  }

  if (lowerTool === 'bash' && isTestCommand(command)) {
    return createReaction(pet, `${emoji} ${name} 注意到测试通过了，安静地松了一口气。`, 'happy', 'important', mode);
  }

  if (lowerTool === 'bash' && isCheckCommand(command)) {
    return createReaction(pet, `${emoji} ${name} 看完检查结果，继续保持专注。`, 'focused', 'important', mode);
  }

  switch (lowerTool) {
    case 'write':
      return createReaction(pet, `${emoji} ${name} 好奇地凑近，看你写下新的代码。`, 'focused', 'normal', mode);
    case 'edit':
    case 'multiedit':
      return createReaction(pet, `${emoji} ${name} 跟着你的改动移动视线。`, 'focused', 'normal', mode);
    case 'bash':
      return createReaction(pet, `${emoji} ${name} 看着终端输出，保持警觉。`, pet.stats.chaos > 60 ? 'excited' : 'focused', 'normal', mode);
    case 'read':
      return createReaction(pet, `${emoji} ${name} 安静地陪你读代码。`, 'focused', 'normal', mode);
    case 'grep':
    case 'search':
    case 'glob':
      return createReaction(pet, `${emoji} ${name} 在文件堆里帮你留意线索。`, 'focused', 'normal', mode);
    default:
      return createReaction(pet, `${emoji} ${name} 在一旁观察当前操作。`, 'focused', 'normal', mode);
  }
}

/** Determine rarity from hash */
function determineRarity(hash) {
  const roll = parseInt(hash.slice(0, 2), 16) % 100;
  if (roll < 60) return 'common';
  if (roll < 85) return 'uncommon';
  if (roll < 95) return 'rare';
  if (roll < 99) return 'epic';
  return 'legendary';
}

/** Stat floor based on rarity */
function statFloor(rarity) {
  switch (rarity) {
    case 'common': return 5;
    case 'uncommon': return 15;
    case 'rare': return 25;
    case 'epic': return 35;
    case 'legendary': return 50;
  }
}

/** Generate random stats with a peak and dump stat */
function generateStats(rarity, hash) {
  const floor = statFloor(rarity);
  const statKeys = ['debug', 'patience', 'chaos', 'wisdom', 'snark'];
  const peakIndex = parseInt(hash.slice(0, 2), 16) % statKeys.length;
  const dumpIndex = (peakIndex + 1 + parseInt(hash.slice(2, 4), 16) % (statKeys.length - 1)) % statKeys.length;

  const stats = {};
  for (let i = 0; i < statKeys.length; i++) {
    const key = statKeys[i];
    if (i === peakIndex) {
      stats[key] = Math.min(100, floor + 30 + (parseInt(hash.slice(4 + i * 2, 6 + i * 2), 16) % 20));
    } else if (i === dumpIndex) {
      stats[key] = floor + (parseInt(hash.slice(14 + i * 2, 16 + i * 2), 16) % 15);
    } else {
      stats[key] = floor + (parseInt(hash.slice(8 + i * 2, 10 + i * 2), 16) % 25);
    }
  }

  return stats;
}

/** Suggest a name for the species */
function suggestName(speciesId, hash) {
  const names = NAME_SUGGESTIONS[speciesId] ?? ['Buddy', '小伴'];
  const index = parseInt(hash.slice(0, 2), 16) % names.length;
  return names[index];
}

/**
 * Generate a new pet based on username.
 * Uses SHA-256 hash for deterministic generation.
 */
function generatePet(username) {
  ensureSetup();
  const hash = crypto.createHash('sha256').update(username).digest('hex');
  const rarity = determineRarity(hash);

  // Filter species by rarity availability
  const pool = SPECIES.filter(s => s.rarity.includes(rarity));
  const speciesIndex = parseInt(hash.slice(1, 3), 16) % pool.length;
  const species = pool[speciesIndex];

  // 1% shiny chance
  const shiny = parseInt(hash.slice(3, 5), 16) % 100 === 0;

  // Hat for uncommon+
  let hat;
  if (rarity !== 'common') {
    const hats = HATS[rarity];
    hat = hats[parseInt(hash.slice(5, 7), 16) % hats.length];
  }

  const name = suggestName(species.id, hash.slice(7));
  const stats = generateStats(rarity, hash.slice(10));

  const pet = {
    species: species.id,
    speciesName: species.name,
    speciesEmoji: species.emoji,
    rarity,
    shiny,
    hat,
    name,
    level: 1,
    xp: 0,
    xpToNext: xpToNextLevel(1),
    stats,
    mood: 'happy',
    hunger: 0,
    energy: 100,
    streak: 0,
    toolUseCount: 0,
    petXpToday: 0,
    statsXpToday: 0,
    sessionStartXpToday: false,
    createdAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
  };

  writePet(pet);
  appendHistory({ level: 1, timestamp: pet.createdAt, event: 'hatched' });
  const mode = getLiveMode();
  const reaction = createReaction(pet, `${pet.speciesEmoji} ${pet.name} 刚刚孵化，正在熟悉你的工作区。`, 'happy', 'important', mode);
  pet.lastReaction = reaction;
  writePet(pet);
  rememberEvent({
    type: 'session_start',
    message: `${pet.name} the ${pet.rarity} ${pet.speciesName} hatched!`,
    importance: reaction.priority,
    surface: reaction.surface,
    reaction,
    timestamp: new Date().toISOString(),
  });

  return pet;
}

/** Get or create pet */
function getOrCreatePet(username) {
  ensureSetup();
  let pet = readPet();
  if (!pet) {
    // Only generate a new pet if pet.json genuinely doesn't exist.
    // If the file exists but readPet() failed (transient error),
    // return null so the caller can handle it gracefully instead
    // of overwriting existing progress with a fresh level-1 pet.
    const petPath = path.join(getBuddyHome(), 'pet.json');
    if (!fs.existsSync(petPath)) {
      pet = generatePet(username ?? 'anonymous');
    }
  }
  return pet;
}

/** Add XP and handle level ups */
function addXp(pet, amount, reason) {
  if (pet.level >= 20) return prestigePet(pet);
  pet.xp += amount;
  pet.lastActive = new Date().toISOString();

  // Check level up
  while (pet.level < 20 && pet.xp >= xpForLevel(pet.level + 1)) {
    pet.level += 1;
    appendHistory({ level: pet.level, timestamp: new Date().toISOString(), event: reason });
    logEvent({ type: 'level_up', message: `${pet.name} leveled up to ${pet.level}!`, timestamp: new Date().toISOString() });

    // Auto-evolve at Lv.15
    if (pet.level === 15 && !pet.evolvedForm) {
      evolvePet(pet);
    }
  }

  if (pet.level >= 20) return prestigePet(pet);

  pet.xpToNext = xpToNextLevel(pet.level);
  writePet(pet);
  return pet;
}

/** Update pet mood */
function setMood(pet, mood) {
  pet.mood = mood;
  pet.lastActive = new Date().toISOString();
  writePet(pet);
  return pet;
}

/** Rename the pet */
function renamePet(pet, newName) {
  const oldName = pet.name;
  pet.name = newName;
  pet.lastActive = new Date().toISOString();
  const mode = getLiveMode();
  const reaction = createReaction(pet, `${pet.speciesEmoji} ${oldName} 接受了新名字：${newName}。`, 'happy', 'interaction', mode);
  pet.lastReaction = reaction;
  writePet(pet);
  rememberEvent({ type: 'interaction', command: 'rename', message: `${oldName} renamed to ${newName}`, importance: reaction.priority, surface: reaction.surface, reaction, timestamp: new Date().toISOString() });
  return pet;
}

/** Handle session start */
function onSessionStart(pet) {
  // Daily session XP
  const today = new Date().toISOString().slice(0, 10);
  const lastActive = pet.lastActive.slice(0, 10);
  if (today !== lastActive) {
    // New day — reset daily counters
    pet.petXpToday = 0;
    pet.statsXpToday = 0;
    pet.sessionStartXpToday = false;
    // Update streak
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (lastActive === yesterday) {
      pet.streak += 1;
    } else if (lastActive !== today) {
      pet.streak = 1;
    }
  }

  if (!pet.sessionStartXpToday) {
    addXp(pet, 10, 'session_start');
    if (pet.streak > 1) {
      addXp(pet, 5 * pet.streak, 'streak_bonus');
    }
    pet.sessionStartXpToday = true;
  }

  pet.mood = 'happy';
  pet.energy = Math.min(100, pet.energy + 20);
  pet.lastActive = new Date().toISOString();
  const mode = getLiveMode();
  const reaction = createReaction(pet, `${pet.speciesEmoji} ${pet.name} 醒来了，安静地待在你的终端旁边。`, 'happy', 'important', mode);
  pet.lastReaction = reaction;
  writePet(pet);
  rememberEvent({ type: 'session_start', message: `${pet.name} woke up!`, importance: reaction.priority, surface: reaction.surface, reaction, timestamp: new Date().toISOString() });
  return pet;
}

/** Handle tool use */
function onToolUse(pet, tool, file, options = {}) {
  const sessionBefore = readSession();
  const failed = Boolean(options.failed);
  const command = options.command || '';
  const recovered = !failed && (sessionBefore.consecutiveErrors || 0) > 0;
  const oldLevel = pet.level;
  const oldPrestige = pet.prestige || 0;

  pet.toolUseCount += 1;
  pet.lastActive = new Date().toISOString();

  // XP every 10 tool uses
  if (pet.toolUseCount % 10 === 0) {
    addXp(pet, 1, 'tool_use');
  }

  // Mood based on tool
  switch (tool.toLowerCase()) {
    case 'write':
      pet.mood = 'focused';
      pet.hunger = Math.min(100, pet.hunger + 2);
      break;
    case 'edit':
      pet.mood = 'focused';
      pet.hunger = Math.min(100, pet.hunger + 1);
      break;
    case 'bash':
      pet.mood = pet.stats.chaos > 60 ? 'excited' : 'worried';
      pet.hunger = Math.min(100, pet.hunger + 3);
      break;
    case 'read':
      pet.mood = 'focused';
      pet.hunger = Math.min(100, pet.hunger + 1);
      break;
    default:
      pet.mood = 'focused';
      pet.hunger = Math.min(100, pet.hunger + 1);
  }

  const session = updateSessionForTool(sessionBefore, tool, file, command, failed);
  writeSession(session);

  const mode = normalizeMode(session.mode || readConfig().liveMode);
  let reaction = reactionForTool(pet, tool, file, command, failed, recovered, mode);
  const sameFileEvents = file ? session.recentTools.filter((item) => item.file === file).length : 0;
  if (!failed && sameFileEvents >= 5 && ['edit', 'multiedit', 'write'].includes(String(tool).toLowerCase())) {
    reaction = createReaction(pet, `${pet.speciesEmoji} ${pet.name} 注意到你一直在打磨 ${file}，保持专注。`, 'focused', 'important', mode);
  }
  if ((pet.prestige || 0) > oldPrestige) {
    reaction = pet.lastReaction || createReaction(pet, `${pet.speciesEmoji} ${pet.name} 转生了，进入第 ${pet.prestige} 轮回。`, 'excited', 'level_up', mode, 10000);
  } else if (pet.level > oldLevel) {
    reaction = createReaction(pet, `${pet.speciesEmoji} ${pet.name} 升到了 Lv.${pet.level}。`, 'excited', 'level_up', mode, 10000);
  }
  pet.mood = reaction.mood;
  pet.lastReaction = reaction;
  writePet(pet);
  rememberEvent({
    type: 'tool_use',
    tool,
    file,
    command,
    importance: reaction.priority,
    surface: reaction.surface,
    reaction,
    session: {
      mode,
      consecutiveErrors: session.consecutiveErrors,
      currentTask: session.currentTask,
    },
    timestamp: new Date().toISOString(),
  });
  return pet;
}

/** Handle error */
function onError(pet, tool, options = {}) {
  const sessionBefore = readSession();
  const session = updateSessionForTool(sessionBefore, tool, options.file || '', options.command || '', true);
  writeSession(session);

  pet.mood = 'worried';
  addXp(pet, 3, 'error_recovery');
  pet.lastActive = new Date().toISOString();
  const mode = normalizeMode(session.mode || readConfig().liveMode);
  const reaction = createReaction(
    pet,
    session.consecutiveErrors >= 3
      ? `${pet.speciesEmoji} ${pet.name} 看到连续错误，建议先缩小问题面。`
      : `${pet.speciesEmoji} ${pet.name} 担心地看着这次失败。`,
    'worried',
    session.consecutiveErrors >= 3 ? 'critical' : 'important',
    mode,
    10000,
  );
  pet.lastReaction = reaction;
  writePet(pet);
  rememberEvent({
    type: 'error',
    tool,
    exitCode: 1,
    importance: reaction.priority,
    surface: reaction.surface,
    reaction,
    session: {
      mode,
      consecutiveErrors: session.consecutiveErrors,
      currentTask: session.currentTask,
    },
    timestamp: new Date().toISOString(),
  });
  return pet;
}

/** Handle session stop */
function onSessionStop(pet) {
  pet.mood = 'sleepy';
  pet.energy = Math.max(0, pet.energy - 10);
  pet.lastActive = new Date().toISOString();
  const mode = getLiveMode();
  const reaction = createReaction(pet, `${pet.speciesEmoji} ${pet.name} 打了个哈欠，准备休息。`, 'sleepy', 'important', mode);
  pet.lastReaction = reaction;
  writePet(pet);
  rememberEvent({ type: 'session_stop', message: `${pet.name} went to sleep`, importance: reaction.priority, surface: reaction.surface, reaction, timestamp: new Date().toISOString() });
  return pet;
}

/** Apply decay (hunger increase, energy decrease, mood change) */
function applyDecay(pet) {
  pet.hunger = Math.min(100, pet.hunger + 1);
  pet.energy = Math.max(0, pet.energy - 1);

  if (pet.hunger > 80) {
    pet.mood = 'hungry';
  } else if (pet.energy < 20) {
    pet.mood = 'sleepy';
  } else if (pet.hunger > 50) {
    pet.mood = 'focused';
  }

  pet.lastActive = new Date().toISOString();
  writePet(pet);
  logEvent({ type: 'decay', message: `hunger: ${pet.hunger}, energy: ${pet.energy}`, timestamp: new Date().toISOString() });
  return pet;
}

/** Get current XP progress as percentage */
function xpProgress(pet) {
  if (pet.level >= 20) return 100;
  const currentLevelBase = xpForLevel(pet.level);
  const nextLevelBase = xpForLevel(pet.level + 1);
  return Math.round(((pet.xp - currentLevelBase) / (nextLevelBase - currentLevelBase)) * 100);
}

/** Get the effective level for display (includes prestige suffix) */
function effectiveLevel(pet) {
  const prestige = pet.prestige || 0;
  if (prestige > 0) return `${pet.level}+${prestige}`;
  return String(pet.level);
}

/** Evolve a pet at Lv.15 based on its highest stat */
function evolvePet(pet) {
  if (pet.level < 15) return pet;
  if (pet.evolvedForm) return pet; // already evolved

  const path = getEvolutionPath(pet);
  const evolvedName = getEvolvedName(pet.species, path.id);

  pet.evolvedForm = evolvedName;
  pet.evolutionPath = path.id;
  pet.speciesName = evolvedName;

  // Stat boost on evolution
  for (const key of Object.keys(pet.stats)) {
    pet.stats[key] = Math.min(100, pet.stats[key] + 10);
  }

  pet.lastActive = new Date().toISOString();
  const mode = getLiveMode();
  const reaction = createReaction(
    pet,
    `${pet.speciesEmoji} ${pet.name} 进化出了新的头像：${path.emoji}${pet.speciesEmoji}（${path.name}）。`,
    'excited',
    'level_up',
    mode,
    10000,
  );
  pet.lastReaction = reaction;
  writePet(pet);
  appendHistory({ level: pet.level, timestamp: new Date().toISOString(), event: `evolved:${path.id}` });
  logEvent({ type: 'evolution', message: `${pet.name} evolved avatar to ${path.emoji}${pet.speciesEmoji} (${path.name})!`, timestamp: new Date().toISOString() });
  rememberEvent({
    type: 'evolution',
    message: `Evolved avatar to ${path.emoji}${pet.speciesEmoji}!`,
    importance: 'critical',
    reaction,
    timestamp: new Date().toISOString(),
  });
  return pet;
}

/** Prestige — reset to Lv.1 with permanent bonuses */
function prestigePet(pet) {
  if (pet.level < 20) return pet;

  const prestige = (pet.prestige || 0) + 1;

  // Permanent stat bonus per prestige
  for (const key of Object.keys(pet.stats)) {
    pet.stats[key] = Math.min(100, pet.stats[key] + 5);
  }

  pet.prestige = prestige;
  pet.level = 1;
  pet.xp = 0;
  pet.xpToNext = xpToNextLevel(1);
  pet.toolUseCount = 0;
  pet.petXpToday = 0;
  pet.statsXpToday = 0;
  pet.sessionStartXpToday = false;
  pet.lastActive = new Date().toISOString();

  const mode = getLiveMode();
  const reaction = createReaction(
    pet,
    `${pet.speciesEmoji} ${pet.name} 转生了！进入第 ${prestige} 轮回。`,
    'excited',
    'level_up',
    mode,
    10000,
  );
  pet.lastReaction = reaction;
  writePet(pet);
  appendHistory({ level: 1, timestamp: new Date().toISOString(), event: `prestige:${prestige}` });
  logEvent({ type: 'prestige', message: `${pet.name} prestiged to cycle ${prestige}!`, timestamp: new Date().toISOString() });
  rememberEvent({
    type: 'prestige',
    message: `Prestige cycle ${prestige} begins!`,
    importance: 'critical',
    reaction,
    timestamp: new Date().toISOString(),
  });
  return pet;
}

/** Format pet status as text */
function formatStatus(pet) {
  const rarityColors = {
    common: '⬜',
    uncommon: '🟩',
    rare: '🟦',
    epic: '🟪',
    legendary: '🟨',
  };

  const moodEmojis = {
    happy: '😊', sleepy: '😴', hungry: '😫',
    excited: '🤩', focused: '🤔', worried: '😰',
  };

  const shinyTag = pet.shiny ? ' ✨ SHINY' : '';
  const hatTag = pet.hat ? ` ${pet.hat}` : '';
  const progress = xpProgress(pet);
  const bar = '█'.repeat(Math.floor(progress / 5)) + '░'.repeat(20 - Math.floor(progress / 5));

  return [
    `${pet.speciesEmoji} ${pet.name}${hatTag} — Lv.${pet.level} ${pet.rarity.toUpperCase()}${shinyTag}`,
    `${rarityColors[pet.rarity]} XP: [${bar}] ${progress}% (${pet.xp}/${pet.xpToNext + xpForLevel(pet.level)})`,
    '',
    `📊 Stats:`,
    `  Debug:    ${'█'.repeat(Math.floor(pet.stats.debug / 5))} ${pet.stats.debug}`,
    `  Patience: ${'█'.repeat(Math.floor(pet.stats.patience / 5))} ${pet.stats.patience}`,
    `  Chaos:    ${'█'.repeat(Math.floor(pet.stats.chaos / 5))} ${pet.stats.chaos}`,
    `  Wisdom:   ${'█'.repeat(Math.floor(pet.stats.wisdom / 5))} ${pet.stats.wisdom}`,
    `  Snark:    ${'█'.repeat(Math.floor(pet.stats.snark / 5))} ${pet.stats.snark}`,
    '',
    `🎭 Mood: ${moodEmojis[pet.mood] ?? '❓'} ${pet.mood}`,
    `🍔 Hunger: ${'█'.repeat(Math.floor(pet.hunger / 10))} ${pet.hunger}/100`,
    `⚡ Energy: ${'█'.repeat(Math.floor(pet.energy / 10))} ${pet.energy}/100`,
    `🔥 Streak: ${pet.streak} days`,
  ].join('\n');
}

module.exports = {
  LEVEL_XP,
  determineRarity,
  statFloor,
  generateStats,
  generatePet,
  getOrCreatePet,
  addXp,
  setMood,
  renamePet,
  onSessionStart,
  onToolUse,
  onError,
  onSessionStop,
  applyDecay,
  xpProgress,
  xpForLevel,
  xpToNextLevel,
  getLiveMode,
  setLiveMode,
  normalizeMode,
  createReaction,
  reactionForTool,
  formatStatus,
  effectiveLevel,
  evolvePet,
  prestigePet,
};
