/**
 * Species definitions for BuddyBar pets.
 * Each species has ASCII art for normal, happy, sleepy, and excited states.
 */

const SPECIES = [
  {
    id: 'cat',
    name: 'Cat',
    emoji: '🐱',
    rarity: ['common', 'uncommon', 'rare'],
    art: {
      normal: ['  /\\_/\\ ', ' ( ·ω·)', ' (")_(")'],
      happy: ['  /\\_/\\ ', ' (≧ω≦)', ' (")_(")'],
      sleepy: ['  /\\_/\\ ', ' ( -ω-)', ' Z(")(")'],
      excited: ['  /\\_/\\ ', ' (★ω★)', ' ┗(>ω<)┛'],
    },
    personality: ['独立', '好奇', '偶尔傲娇'],
  },
  {
    id: 'duck',
    name: 'Duck',
    emoji: '🦆',
    rarity: ['common', 'uncommon'],
    art: {
      normal: [' __(·>', ' __(._>', '  `--´ '],
      happy: [' __(≧▽≦)>', ' __(·ω·)>', '  ♪♪♪ '],
      sleepy: [' __(·_·)>', ' __(._.)>', '  `zzz´ '],
      excited: [' __(★>★)>', ' __(·ω·)>', '  ~quack~ '],
    },
    personality: ['开朗', '话多', '爱跟着你'],
  },
  {
    id: 'ghost',
    name: 'Ghost',
    emoji: '👻',
    rarity: ['common', 'uncommon'],
    art: {
      normal: [' .[||]. ', ' [ · · ] ', ' [ ==== ] '],
      happy: [' .[||]. ', ' [ ≧▽≦] ', ' [ ==== ] '],
      sleepy: [' .[||]. ', ' [ - · -] ', ' [ ==== ] '],
      excited: [' .[||]. ', ' [ ★ · ★] ', ' [ ~~~~ ] '],
    },
    personality: ['安静', '神秘', '飘来飘去'],
  },
  {
    id: 'robot',
    name: 'Robot',
    emoji: '🤖',
    rarity: ['common', 'uncommon', 'rare'],
    art: {
      normal: ['  [||]  ', '  {(·)} ', ' [====] '],
      happy: ['  [||]  ', '  {(≧)} ', ' [====] '],
      sleepy: ['  [||]  ', '  {(-)} ', ' [====] '],
      excited: ['  [||]  ', '  {(★)} ', ' [≈≈≈≈] '],
    },
    personality: ['逻辑严密', '偶尔短路', '喜欢数字'],
  },
  {
    id: 'dragon',
    name: 'Dragon',
    emoji: '🐉',
    rarity: ['uncommon', 'rare', 'epic'],
    art: {
      normal: ['  /^\\  ', ' < · · >', ' ( ~~ )', ' `-vvvv-´'],
      happy: ['  /^\\  ', ' < ≧▽≦>', ' ( ~~ )', ' `-vvvv-´'],
      sleepy: ['  /^\\  ', ' < - · ->', ' ( ~~ )', ' `-zzzz-´'],
      excited: ['  /^\\  ', ' < ★▽★>', ' (🔥🔥) ', ' `-vvvv-´'],
    },
    personality: ['傲娇', '喜欢 hoard 代码', '偶尔喷火'],
  },
  {
    id: 'owl',
    name: 'Owl',
    emoji: '🦉',
    rarity: ['uncommon', 'rare'],
    art: {
      normal: ['  /\\ /\\  ', ' ((·)(·))', '  ( >< ) '],
      happy: ['  /\\ /\\  ', ' ((≧)(≦))', '  ( ∩∩ ) '],
      sleepy: ['  /\\ /\\  ', ' ((-)(-))', '  ( ·· ) '],
      excited: ['  /\\ /\\  ', ' ((★)(★))', '  ( ◉◉ ) '],
    },
    personality: ['博学', '夜晚活跃', '爱讲道理'],
  },
  {
    id: 'fox',
    name: 'Fox',
    emoji: '🦊',
    rarity: ['rare', 'epic'],
    art: {
      normal: ['  /|  |\\ ', '  | >·< |', '  | \\  / |'],
      happy: ['  /|  |\\ ', '  | ≧▽≦ |', '  | \\  / |'],
      sleepy: ['  /|  |\\ ', '  | -·- |', '  |    z |'],
      excited: ['  /|  |\\ ', '  | ★▽★ |', '  | /  \\ |'],
    },
    personality: ['狡猾', '聪明', '喜欢搞恶作剧'],
  },
  {
    id: 'axolotl',
    name: 'Axolotl',
    emoji: '🦎',
    rarity: ['rare', 'epic'],
    art: {
      normal: [' }~(____)~{ ', ' }~(·..·)~{ ', '   (._.)   '],
      happy: [' }~(____)~{ ', ' }~(≧▽≦)~{ ', '   (◕‿◕)   '],
      sleepy: [' }~(____)~{ ', ' }~(-·- )~{ ', '   (._.)zz '],
      excited: [' }~(____)~{ ', ' }~(★▽★)~{ ', '   (◉ω◉)   '],
    },
    personality: ['呆萌', '永远微笑', '水系大师'],
  },
  {
    id: 'phoenix',
    name: 'Phoenix',
    emoji: '🔥',
    rarity: ['epic', 'legendary'],
    art: {
      normal: ['  .,,.  ', '  ( @ ) ', '  /|\\  ', '  |\\/| '],
      happy: ['  .,,.  ', ' ( ≧▽≦) ', '  /|\\  ', '  ~✨~ '],
      sleepy: ['  .,,.  ', '  ( - ) ', '  /|\\  ', '  |  | '],
      excited: ['  ★,,★  ', ' ( ★▽★) ', '  /🔥\\ ', '  ~✨~ '],
    },
    personality: ['浴火重生', '充满希望', '永远乐观'],
  },
  {
    id: 'capybara',
    name: 'Capybara',
    emoji: '🫎',
    rarity: ['legendary'],
    art: {
      normal: [' n______n ', ' ( · · ) ', ' ( oo ) ', ' `----´ '],
      happy: [' n______n ', ' ( ≧▽≦) ', ' ( oo ) ', ' `----´ '],
      sleepy: [' n______n ', ' ( - · -) ', ' ( oo ) ', ' `----´ '],
      excited: [' n______n ', ' ( ★ω★) ', ' ( OO ) ', ' `----´ '],
    },
    personality: ['佛系', '情绪稳定', '万物之友'],
  },
  {
    id: 'slime',
    name: 'Slime',
    emoji: '🟢',
    rarity: ['common', 'uncommon'],
    art: {
      normal: ['  ___  ', ' /   \\ ', '| · · |', ' \\___/ '],
      happy: ['  ___  ', ' /   \\ ', '| ≧▽≦|', ' \\___/ '],
      sleepy: ['  ___  ', ' /   \\ ', '| - ·-|', ' \\___/ '],
      excited: ['  ___  ', ' /   \\ ', '| ★▽★|', ' \\~~~\\ '],
    },
    personality: ['柔软', '弹来弹去', '什么都能吃'],
  },
  {
    id: 'penguin',
    name: 'Penguin',
    emoji: '🐧',
    rarity: ['uncommon', 'rare'],
    art: {
      normal: ['  (·)  ', ' <( )> ', '  /|\\  ', '  / \\ '],
      happy: ['  (·)  ', ' <(≧)> ', '  /|\\  ', '  / \\ '],
      sleepy: ['  (-)  ', ' <( )> ', '  /|\\  ', '  z z '],
      excited: ['  (★)  ', ' <(★)> ', '  /|\\  ', '  ♪♪♪ '],
    },
    personality: ['憨厚', '喜欢冰', '走路摇摆'],
  },
];

/** Suggested names by species */
const NAME_SUGGESTIONS = {
  cat: ['小橘', '喵酱', 'Code Cat', 'Neko'],
  duck: ['鸭鸭', 'Quack', '小黄', 'Ducky'],
  ghost: ['幽灵', 'Casper', '小透明', 'Phantom'],
  robot: ['小机', 'Bot', 'T-800', 'R2'],
  dragon: ['小龙', 'Draco', '火火', 'Smaug'],
  owl: ['猫头鹰', 'Hoot', '智者', 'Owlbert'],
  fox: ['小狐', 'Firefox', '狡狐', 'Kitsune'],
  axolotl: ['六角恐龙', 'Axo', '呆呆', 'Mexican'],
  phoenix: ['凤凰', 'Fawkes', '不死鸟', 'Blaze'],
  capybara: ['卡皮巴拉', 'Capy', '佛系', 'Chill'],
  slime: ['史莱姆', 'Blob', '果冻', 'Gooey'],
  penguin: ['企鹅', 'Pingu', '冰宝', 'Waddle'],
};

/** Hats by rarity */
const HATS = {
  common: [],
  uncommon: ['🎩', '🎀', '⚽'],
  rare: ['👑', '🎓', '🧢', '🎩'],
  epic: ['⭐', '🌈', '💎', '🔮'],
  legendary: ['🏆', '🔱', '✨', '🌟'],
};

/**
 * Evolution paths — each keyed by a stat name.
 * At Lv.15 a pet evolves based on its highest stat.
 */
const EVOLUTION_PATHS = {
  debug: { id: 'valor', name: 'Valor', emoji: '⚔️', label: '勇' },
  patience: { id: 'zen', name: 'Zen', emoji: '🪷', label: '禅' },
  chaos: { id: 'storm', name: 'Storm', emoji: '⚡', label: '雷' },
  wisdom: { id: 'sage', name: 'Sage', emoji: '📖', label: '智' },
  snark: { id: 'rogue', name: 'Rogue', emoji: '🎭', label: '影' },
};

/**
 * Evolved species names — keyed by `${baseSpeciesId}.${pathId}`.
 * Falls back to `${pathName} ${baseSpeciesName}` if not found.
 */
const EVOLVED_NAMES = {
  'cat.valor': '剑猫',
  'cat.zen': '禅猫',
  'cat.storm': '雷猫',
  'cat.sage': '智猫',
  'cat.rogue': '影猫',
  'duck.valor': '战鸭',
  'duck.zen': '禅鸭',
  'duck.storm': '雷鸭',
  'duck.sage': '智鸭',
  'duck.rogue': '影鸭',
  'ghost.valor': '战灵',
  'ghost.zen': '禅灵',
  'ghost.storm': '雷灵',
  'ghost.sage': '智灵',
  'ghost.rogue': '影灵',
  'robot.valor': '战械',
  'robot.zen': '禅械',
  'robot.storm': '雷械',
  'robot.sage': '智械',
  'robot.rogue': '影械',
  'dragon.valor': '战龙',
  'dragon.zen': '禅龙',
  'dragon.storm': '雷龙',
  'dragon.sage': '智龙',
  'dragon.rogue': '影龙',
  'owl.valor': '战鸮',
  'owl.zen': '禅鸮',
  'owl.storm': '雷鸮',
  'owl.sage': '智鸮',
  'owl.rogue': '影鸮',
  'fox.valor': '战狐',
  'fox.zen': '禅狐',
  'fox.storm': '雷狐',
  'fox.sage': '智狐',
  'fox.rogue': '影狐',
  'axolotl.valor': '战鲵',
  'axolotl.zen': '禅鲵',
  'axolotl.storm': '雷鲵',
  'axolotl.sage': '智鲵',
  'axolotl.rogue': '影鲵',
  'phoenix.valor': '战凤',
  'phoenix.zen': '禅凤',
  'phoenix.storm': '雷凤',
  'phoenix.sage': '智凤',
  'phoenix.rogue': '影凤',
  'capybara.valor': '战豚',
  'capybara.zen': '禅豚',
  'capybara.storm': '雷豚',
  'capybara.sage': '智豚',
  'capybara.rogue': '影豚',
  'slime.valor': '战泥',
  'slime.zen': '禅泥',
  'slime.storm': '雷泥',
  'slime.sage': '智泥',
  'slime.rogue': '影泥',
  'penguin.valor': '战鹅',
  'penguin.zen': '禅鹅',
  'penguin.storm': '雷鹅',
  'penguin.sage': '智鹅',
  'penguin.rogue': '影鹅',
};

/**
 * Art modifiers per evolution path.
 * Each function takes the base art lines and returns evolved art lines.
 * Applied at render time — no permanent art mutation.
 */
const EVOLVED_ART_MODIFIERS = {
  valor(art) {
    // Add sword/blade indicators to sides
    return art.map((line, i) => {
      if (i === 0) return `⚔${line}`;
      return `  ${line}`;
    });
  },
  zen(art) {
    // Add serene aura rings
    return art.map((line) => `≋${line}`);
  },
  storm(art) {
    // Add electric sparks
    return art.map((line, i) => {
      if (i === 0) return `⚡${line}`;
      return `  ${line}`;
    });
  },
  sage(art) {
    // Add wisdom glow
    return art.map((line) => `✧${line}`);
  },
  rogue(art) {
    // Add shadow wisps
    return art.map((line, i) => {
      if (i === art.length - 1) return `◇${line}`;
      return `  ${line}`;
    });
  },
};

/**
 * Get the evolution path for a pet based on its highest stat.
 */
function getEvolutionPath(pet) {
  const stats = pet.stats || {};
  let maxStat = 'debug';
  let maxVal = 0;
  for (const [stat, val] of Object.entries(stats)) {
    if (val > maxVal) {
      maxVal = val;
      maxStat = stat;
    }
  }
  return EVOLUTION_PATHS[maxStat] || EVOLUTION_PATHS.debug;
}

/**
 * Get the evolved name for a species + path combination.
 */
function getEvolvedName(speciesId, pathId) {
  return EVOLVED_NAMES[`${speciesId}.${pathId}`] || `${pathId} ${speciesId}`;
}

/**
 * Apply evolution art modifier to base art.
 */
function applyEvolvedArt(baseArt, pathId) {
  const modifier = EVOLVED_ART_MODIFIERS[pathId];
  if (!modifier) return baseArt;
  return modifier([...baseArt]);
}

module.exports = {
  SPECIES,
  NAME_SUGGESTIONS,
  HATS,
  EVOLUTION_PATHS,
  EVOLVED_NAMES,
  EVOLVED_ART_MODIFIERS,
  getEvolutionPath,
  getEvolvedName,
  applyEvolvedArt,
};
