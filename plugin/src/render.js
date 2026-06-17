/**
 * Shared terminal rendering helpers for BuddyBar presence surfaces.
 * This module is intentionally side-effect free: callers pass state in and
 * receive a string to print.
 */

const { SPECIES, EVOLUTION_PATHS, applyEvolvedArt } = require('./data/species');
const { xpProgress, effectiveLevel } = require('./core');

const ESC = '\x1b[';
const CLEAR = `${ESC}2J${ESC}H`;

const colorCodes = {
  reset: `${ESC}0m`,
  bold: `${ESC}1m`,
  dim: `${ESC}2m`,
  red: `${ESC}31m`,
  green: `${ESC}32m`,
  yellow: `${ESC}33m`,
  blue: `${ESC}34m`,
  magenta: `${ESC}35m`,
  cyan: `${ESC}36m`,
  white: `${ESC}37m`,
  gray: `${ESC}90m`,
  brightGreen: `${ESC}92m`,
  brightYellow: `${ESC}93m`,
  brightBlue: `${ESC}94m`,
  brightMagenta: `${ESC}95m`,
  brightCyan: `${ESC}96m`,
};

const plainCodes = Object.fromEntries(Object.keys(colorCodes).map((key) => [key, '']));

const moodEmojis = {
  happy: '😊',
  sleepy: '😴',
  hungry: '😫',
  excited: '🤩',
  focused: '🤔',
  worried: '😰',
};

const rarityMarks = {
  common: 'white',
  uncommon: 'brightGreen',
  rare: 'brightBlue',
  epic: 'brightMagenta',
  legendary: 'brightYellow',
};

function palette(color = true) {
  return color ? colorCodes : plainCodes;
}

function stripAnsi(text) {
  return String(text ?? '').replace(/\x1b\[[0-9;]*m/g, '');
}

function isCombiningCodePoint(code) {
  return (
    (code >= 0x0300 && code <= 0x036f) ||
    (code >= 0x1ab0 && code <= 0x1aff) ||
    (code >= 0x1dc0 && code <= 0x1dff) ||
    (code >= 0x20d0 && code <= 0x20ff) ||
    (code >= 0xfe20 && code <= 0xfe2f)
  );
}

function isWideCodePoint(code) {
  return (
    (code >= 0x1100 && code <= 0x115f) ||
    code === 0x2329 ||
    code === 0x232a ||
    (code >= 0x2e80 && code <= 0xa4cf && code !== 0x303f) ||
    (code >= 0xac00 && code <= 0xd7a3) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xfe10 && code <= 0xfe19) ||
    (code >= 0xfe30 && code <= 0xfe6f) ||
    (code >= 0xff00 && code <= 0xff60) ||
    (code >= 0xffe0 && code <= 0xffe6) ||
    (code >= 0x1f000 && code <= 0x1faff) ||
    (code >= 0x20000 && code <= 0x3fffd)
  );
}

function charWidth(char) {
  const code = char.codePointAt(0);
  if (!code) return 0;
  if (code === 0x200d || (code >= 0xfe00 && code <= 0xfe0f) || isCombiningCodePoint(code)) {
    return 0;
  }
  if (code < 0x20 || (code >= 0x7f && code < 0xa0)) return 0;
  return isWideCodePoint(code) ? 2 : 1;
}

function visibleLength(text) {
  return Array.from(stripAnsi(text)).reduce((sum, char) => sum + charWidth(char), 0);
}

function sliceByWidth(text, maxWidth) {
  let width = 0;
  let output = '';
  for (const char of Array.from(String(text ?? ''))) {
    const nextWidth = charWidth(char);
    if (width + nextWidth > maxWidth) break;
    output += char;
    width += nextWidth;
  }
  return output;
}

function clipText(text, size) {
  const value = String(text ?? '');
  if (visibleLength(value) <= size) return value;
  const plain = stripAnsi(value);
  return sliceByWidth(plain, Math.max(0, size - 1)) + '…';
}

function padRight(text, size) {
  const value = clipText(text, size);
  return value + ' '.repeat(Math.max(0, size - visibleLength(value)));
}

function center(text, size) {
  const value = clipText(text, size);
  const left = Math.max(0, Math.floor((size - visibleLength(value)) / 2));
  return ' '.repeat(left) + value;
}

function wrapText(text, maxLen) {
  const value = String(text ?? '');
  if (visibleLength(value) <= maxLen) return [value];
  const lines = [];
  let remaining = value;
  while (remaining.length > 0) {
    if (visibleLength(remaining) <= maxLen) {
      lines.push(remaining);
      break;
    }

    let width = 0;
    let breakAt = 0;
    let lastSoftBreak = -1;
    for (const char of Array.from(remaining)) {
      const nextWidth = charWidth(char);
      if (width + nextWidth > maxLen) break;
      breakAt += char.length;
      width += nextWidth;
      if (char === ' ' || char === '，' || char === '。') {
        lastSoftBreak = breakAt;
      }
    }
    if (lastSoftBreak > 0 && breakAt - lastSoftBreak < 8) {
      breakAt = lastSoftBreak;
    }
    if (breakAt <= 0) {
      breakAt = Array.from(remaining)[0]?.length || 1;
    }
    lines.push(remaining.slice(0, breakAt).trimEnd());
    remaining = remaining.slice(breakAt).trimStart();
  }
  return lines;
}

function validateFrameWidth(output, width) {
  const problems = [];
  const expectedWidth = Number(width);
  if (!expectedWidth) return problems;
  output.split('\n').forEach((line, index) => {
    const actual = visibleLength(line);
    if (actual !== expectedWidth) {
      problems.push({ line: index + 1, expected: expectedWidth, actual, text: stripAnsi(line) });
    }
  });
  return problems;
}

function bar(value, size, color, colors = palette(true)) {
  const cells = Math.max(4, Math.floor(size));
  const normalized = Math.max(0, Math.min(100, Number(value) || 0));
  const filled = Math.max(0, Math.min(cells, Math.round((normalized / 100) * cells)));
  return `${color}${'█'.repeat(filled)}${colors.gray}${'░'.repeat(cells - filled)}${colors.reset}`;
}

function moodColor(mood, colors) {
  if (mood === 'happy' || mood === 'excited') return colors.brightGreen;
  if (mood === 'worried' || mood === 'hungry') return colors.red;
  if (mood === 'sleepy') return colors.yellow;
  return colors.brightGreen;
}

function rarityColor(rarity, colors) {
  return colors[rarityMarks[rarity] || 'white'];
}

function getPetArt(pet, options = {}) {
  const species = SPECIES.find((item) => item.id === pet?.species);
  if (!species) return ['???'];

  let art;
  switch (pet.mood) {
    case 'happy':
      art = [...species.art.happy];
      break;
    case 'excited':
      art = [...species.art.excited];
      break;
    case 'sleepy':
      art = [...species.art.sleepy];
      break;
    default:
      art = [...species.art.normal];
      break;
  }

  if (options.blink) {
    art = art.map((line) => line.replace(/·/g, '-'));
  }
  if (pet.shiny && (options.frame ?? 0) % 4 < 2) {
    art[0] = `✨${art[0]}`;
  }
  if (pet.hat) {
    art.unshift(`  ${pet.hat}  `);
  }
  return art;
}

function getShowcaseArt(pet, options = {}) {
  const moodFace = {
    happy: '•‿•',
    focused: '•_•',
    sleepy: '-_-',
    hungry: 'o_o',
    worried: 'o_o',
    excited: '★_★',
  }[pet?.mood] || '•_•';

  let art;
  switch (pet?.species) {
    case 'cat':
      art = ['   /\\___/\\   ', `  (  ${moodFace}  )  `, '  /   >   \\  ', ' /___x_____\\ '];
      break;
    case 'dragon':
      art = ['     /^\\     ', ` <  ${moodFace}  >→`, ' (   ~   )  ', '  `-zzzz-´  '];
      break;
    case 'ghost':
      art = ['   .-"""-.   ', `  / ${moodFace} \\  `, '  \\  ~  /   ', '   `---´    '];
      break;
    case 'robot':
      art = ['   [ || ]   ', `  { ${moodFace} }  `, '  [====]   ', '  /|__|\\   '];
      break;
    case 'slime':
      art = ['    ____    ', '  /      \\  ', ` |  ${moodFace}  | `, '  \\______/  '];
      break;
    case 'penguin':
      art = ['    (•)     ', `  <(${moodFace})> `, '    /|\\    ', '    / \\    '];
      break;
    default:
      art = getPetArt(pet, options);
  }

  // Apply evolution art modifier
  if (pet?.evolutionPath) {
    art = applyEvolvedArt(art, pet.evolutionPath);
  }

  return art;
}

function friendlyEventLabel(event) {
  if (event?.text?.includes('测试通过')) return 'Tests passed';
  if (event?.type === 'error') return 'Command failed';
  if (event?.tool === 'Write') return 'Wrote file';
  if (event?.tool === 'Edit' || event?.tool === 'MultiEdit') return 'Edited file';
  if (event?.tool === 'Read') return 'Code analyzed';
  if (event?.type === 'interaction') return event.command ? `/${event.command}` : 'Interaction';
  if (event?.type === 'session_start') return 'Session started';
  if (event?.type === 'session_stop') return 'Session stopped';
  return event?.tool || event?.type || 'Activity';
}

function eventDot(event, colors) {
  if (event?.priority === 'critical' || event?.type === 'error') return `${colors.red}●${colors.reset}`;
  if (event?.priority === 'important' || event?.text?.includes('测试')) return `${colors.green}●${colors.reset}`;
  return `${colors.blue}●${colors.reset}`;
}

function modeOf(session = {}, config = {}) {
  return session.mode || config.liveMode || 'focus';
}

function evolutionDetails(pet) {
  if (!pet?.evolutionPath) return 'Path: unevolved';
  const path = Object.values(EVOLUTION_PATHS).find((item) => item.id === pet.evolutionPath);
  if (!path) return `Path: ${pet.evolutionPath}`;
  return `Path: ${path.emoji} ${path.name} / ${path.label}`;
}

function prestigeDetails(pet) {
  const prestige = pet?.prestige || 0;
  if (prestige <= 0) return 'Prestige: none';
  return `Prestige: ✦${prestige}  permanent bonus +${prestige * 5}`;
}

function renderEmptyState(options = {}) {
  const colors = palette(options.color !== false);
  const width = Math.max(24, options.width || 42);
  const height = options.height || 0;
  const inner = width - 4;
  const lines = [
    `${colors.dim}╭${'─'.repeat(width - 2)}╮${colors.reset}`,
    `${colors.dim}│${colors.reset} ${padRight(`${colors.brightCyan}${colors.bold}BuddyBar${colors.reset}`, inner)} ${colors.dim}│${colors.reset}`,
    `${colors.dim}├${'─'.repeat(width - 2)}┤${colors.reset}`,
    `${colors.dim}│${colors.reset} ${padRight(center('🥚', inner), inner)} ${colors.dim}│${colors.reset}`,
    `${colors.dim}│${colors.reset} ${padRight(center('Buddy is warming up', inner), inner)} ${colors.dim}│${colors.reset}`,
  ];

  for (const line of wrapText('Run /buddybar:buddy hatch or wait for session start.', inner)) {
    lines.push(`${colors.dim}│${colors.reset} ${padRight(line, inner)} ${colors.dim}│${colors.reset}`);
  }
  lines.push(`${colors.dim}╰${'─'.repeat(width - 2)}╯${colors.reset}`);
  return height ? lines.slice(0, height).join('\n') : lines.join('\n');
}

function renderDetailCard(options = {}) {
  const colors = palette(options.color !== false);
  const pet = options.pet;
  if (!pet) return renderEmptyState(options);

  const session = options.session || {};
  const config = options.config || {};
  const width = Math.max(56, options.width || 72);
  const inner = width - 4;
  const mode = modeOf(session, config);
  const progress = xpProgress(pet);
  const rc = rarityColor(pet.rarity, colors);
  const mood = `${moodEmojis[pet.mood] || '❓'} ${pet.mood}`;
  const shinyTag = pet.shiny ? ` ${colors.brightYellow}SHINY${colors.reset}` : '';
  const reaction = pet.lastReaction?.text || '';
  const recent = Array.isArray(session.recentEvents) ? session.recentEvents.slice(-3) : [];
  const art = getShowcaseArt(pet, { frame: options.frame || 0, blink: false });
  const eLv = effectiveLevel(pet);
  const prestige = pet.prestige || 0;
  const prestigeTag = prestige > 0 ? ` ${colors.brightYellow}\u2726${prestige}${colors.reset}` : '';
  const evolutionTag = pet.evolvedForm ? ` ${colors.magenta}[${pet.evolvedForm}]${colors.reset}` : '';
  const leftArtWidth = Math.min(24, Math.max(...art.map(visibleLength), 8) + 2);
  const quoteWidth = inner - leftArtWidth - 2;
  const reactionLines = reaction ? wrapText(`"${reaction}"`, Math.max(12, quoteWidth)).slice(0, art.length) : [];

  const lines = [];
  lines.push(`${colors.dim}╭${'─'.repeat(width - 2)}╮${colors.reset}`);
  lines.push(`${colors.dim}│${colors.reset} ${padRight(`${colors.brightCyan}${colors.bold}BuddyBar${colors.reset}`, inner)} ${colors.dim}│${colors.reset}`);
  lines.push(`${colors.dim}├${'─'.repeat(width - 2)}┤${colors.reset}`);
  lines.push(`${colors.dim}│${colors.reset} ${padRight(`${pet.speciesEmoji} ${colors.bold}${pet.name}${colors.reset}${shinyTag}${evolutionTag}${prestigeTag}  ${rc}Lv.${eLv} ${pet.rarity}${colors.reset}  ${colors.cyan}${mode}${colors.reset}`, inner)} ${colors.dim}│${colors.reset}`);
  lines.push(`${colors.dim}│${colors.reset} ${padRight(`XP ${bar(progress, 16, colors.brightGreen, colors)} ${progress}%   ${mood}   streak ${pet.streak || 0}d`, inner)} ${colors.dim}│${colors.reset}`);
  lines.push(`${colors.dim}│${colors.reset} ${padRight(`${evolutionDetails(pet)}   ${prestigeDetails(pet)}`, inner)} ${colors.dim}│${colors.reset}`);
  lines.push(`${colors.dim}│${colors.reset} ${padRight(`Energy ${bar(pet.energy, 10, colors.brightYellow, colors)} ${String(pet.energy).padStart(3)}/100   Hunger ${bar(pet.hunger, 10, colors.red, colors)} ${String(pet.hunger).padStart(3)}/100`, inner)} ${colors.dim}│${colors.reset}`);
  lines.push(`${colors.dim}│${colors.reset} ${' '.repeat(inner)} ${colors.dim}│${colors.reset}`);

  for (let i = 0; i < art.length; i++) {
    const artLine = center(art[i], leftArtWidth);
    const quote = reactionLines[i] || '';
    lines.push(`${colors.dim}│${colors.reset} ${padRight(`${artLine}  ${colors.yellow}${quote}${colors.reset}`, inner)} ${colors.dim}│${colors.reset}`);
  }

  lines.push(`${colors.dim}│${colors.reset} ${' '.repeat(inner)} ${colors.dim}│${colors.reset}`);
  lines.push(`${colors.dim}│${colors.reset} ${padRight(`${colors.cyan}Debug${colors.reset} ${pet.stats.debug}   ${colors.cyan}Patience${colors.reset} ${pet.stats.patience}   ${colors.cyan}Chaos${colors.reset} ${pet.stats.chaos}   ${colors.cyan}Wisdom${colors.reset} ${pet.stats.wisdom}   ${colors.cyan}Snark${colors.reset} ${pet.stats.snark}`, inner)} ${colors.dim}│${colors.reset}`);

  if (recent.length > 0) {
    lines.push(`${colors.dim}├${'─'.repeat(width - 2)}┤${colors.reset}`);
    for (const event of recent) {
      const time = event.timestamp ? event.timestamp.slice(11, 16) : '--:--';
      lines.push(`${colors.dim}│${colors.reset} ${padRight(`${eventDot(event, colors)} ${colors.gray}${time}${colors.reset}  ${friendlyEventLabel(event)} ${colors.dim}${event.file || event.text || ''}${colors.reset}`, inner)} ${colors.dim}│${colors.reset}`);
    }
  }

  lines.push(`${colors.dim}╰${'─'.repeat(width - 2)}╯${colors.reset}`);
  return lines.join('\n');
}

module.exports = {
  CLEAR,
  colors: colorCodes,
  palette,
  stripAnsi,
  visibleLength,
  validateFrameWidth,
  wrapText,
  bar,
  getPetArt,
  getShowcaseArt,
  friendlyEventLabel,
  renderDetailCard,
  renderEmptyState,
};
