const crypto = require('crypto');

// Mock storage before requiring core
jest.mock('../src/storage', () => {
  let _pet = null;
  let _config = { liveMode: 'focus' };
  let _session = {
    mode: 'focus',
    currentTask: '',
    consecutiveErrors: 0,
    lastFailureAt: null,
    lastRecoveryAt: null,
    lastActivityAt: null,
    recentTools: [],
    recentEvents: [],
  };
  let _history = [];

  return {
    ensureSetup: jest.fn(),
    readPet: jest.fn(() => _pet),
    writePet: jest.fn((pet) => { _pet = pet; }),
    logEvent: jest.fn(),
    appendHistory: jest.fn((entry) => { _history.push(entry); }),
    readConfig: jest.fn(() => _config),
    writeConfig: jest.fn((c) => { _config = c; }),
    readSession: jest.fn(() => ({ ..._session, recentTools: [..._session.recentTools], recentEvents: [..._session.recentEvents] })),
    writeSession: jest.fn((s) => { _session = s; }),
    rememberSessionEvent: jest.fn((session, event) => {
      const next = { ...session };
      next.recentEvents = [...(next.recentEvents || []), event].slice(-12);
      return next;
    }),
    getBuddyHome: jest.fn(() => '/tmp/mock-buddy'),
    // Test helpers to reset state
    _reset() { _pet = null; _config = { liveMode: 'focus' }; _session = { mode: 'focus', currentTask: '', consecutiveErrors: 0, lastFailureAt: null, lastRecoveryAt: null, lastActivityAt: null, recentTools: [], recentEvents: [] }; _history = []; },
    _setPet(p) { _pet = p; },
    _setSession(s) { _session = s; },
  };
});

const storage = require('../src/storage');
const core = require('../src/core');

beforeEach(() => {
  storage._reset();
  jest.clearAllMocks();
});

// ── Pure functions (no storage dependency via mock) ──

describe('xpForLevel', () => {
  test('returns correct XP for each level', () => {
    expect(core.xpForLevel(1)).toBe(0);
    expect(core.xpForLevel(10)).toBe(300);
    expect(core.xpForLevel(15)).toBe(600);
    expect(core.xpForLevel(20)).toBe(1000);
  });

  test('clamps to level 20 for out-of-range', () => {
    expect(core.xpForLevel(99)).toBe(1000);
  });
});

describe('xpToNextLevel', () => {
  test('returns XP delta to next level', () => {
    expect(core.xpToNextLevel(1)).toBe(20);
    expect(core.xpToNextLevel(9)).toBe(40);  // 300 - 260
    expect(core.xpToNextLevel(14)).toBe(80);  // 600 - 520
  });

  test('returns 0 at max level', () => {
    expect(core.xpToNextLevel(20)).toBe(0);
    expect(core.xpToNextLevel(99)).toBe(0);
  });
});

describe('normalizeMode', () => {
  test('accepts valid modes', () => {
    expect(core.normalizeMode('quiet')).toBe('quiet');
    expect(core.normalizeMode('focus')).toBe('focus');
    expect(core.normalizeMode('lively')).toBe('lively');
  });

  test('defaults to focus for invalid modes', () => {
    expect(core.normalizeMode('')).toBe('focus');
    expect(core.normalizeMode('party')).toBe('focus');
    expect(core.normalizeMode(undefined)).toBe('focus');
  });
});

describe('determineRarity', () => {
  test('is deterministic from hash', () => {
    // "00" → 0 % 100 = 0 → common
    expect(core.determineRarity('00')).toBe('common');
    // "3b" → 59 % 100 = 59 → common
    expect(core.determineRarity('3b')).toBe('common');
    // "3c" → 60 % 100 = 60 → uncommon (60 < 85)
    expect(core.determineRarity('3c')).toBe('uncommon');
    // "54" → 84 % 100 = 84 → uncommon
    expect(core.determineRarity('54')).toBe('uncommon');
    // "55" → 85 % 100 = 85 → rare (85 < 95)
    expect(core.determineRarity('55')).toBe('rare');
    // "5e" → 94 % 100 = 94 → rare
    expect(core.determineRarity('5e')).toBe('rare');
    // "5f" → 95 % 100 = 95 → epic (95 < 99)
    expect(core.determineRarity('5f')).toBe('epic');
    // "62" → 98 % 100 = 98 → epic
    expect(core.determineRarity('62')).toBe('epic');
    // "63" → 99 % 100 = 99 → legendary
    expect(core.determineRarity('63')).toBe('legendary');
  });
});

describe('generateStats', () => {
  test('produces all 5 stats within expected range', () => {
    const hash = crypto.createHash('sha256').update('testuser').digest('hex').slice(10);
    const stats = core.generateStats('rare', hash);
    const keys = Object.keys(stats);
    expect(keys.sort()).toEqual(['chaos', 'debug', 'patience', 'snark', 'wisdom']);
    for (const val of Object.values(stats)) {
      expect(val).toBeGreaterThanOrEqual(25);  // rare floor
      expect(val).toBeLessThanOrEqual(100);
    }
  });

  test('peak stat is notably higher than dump stat', () => {
    const hash = crypto.createHash('sha256').update('peaktest').digest('hex').slice(10);
    const stats = core.generateStats('common', hash);
    const values = Object.values(stats);
    const max = Math.max(...values);
    const min = Math.min(...values);
    // Peak gets floor+30+bonus, dump gets floor+small bonus — gap should be >= 15
    expect(max - min).toBeGreaterThanOrEqual(15);
  });
});

describe('xpProgress', () => {
  test('returns 0 at level start', () => {
    const pet = { level: 2, xp: 20 };
    expect(core.xpProgress(pet)).toBe(0);
  });

  test('returns 100 at max level', () => {
    const pet = { level: 20, xp: 9999 };
    expect(core.xpProgress(pet)).toBe(100);
  });

  test('calculates mid-progress correctly', () => {
    // Level 2: base 20, next 50 → range 30
    // xp 35 → (35-20)/(50-20) = 15/30 = 50%
    const pet = { level: 2, xp: 35 };
    expect(core.xpProgress(pet)).toBe(50);
  });
});

describe('effectiveLevel', () => {
  test('returns plain level with no prestige', () => {
    expect(core.effectiveLevel({ level: 7, prestige: 0 })).toBe('7');
    expect(core.effectiveLevel({ level: 15 })).toBe('15');  // prestige defaults via spread
  });

  test('returns level+prestige after prestige', () => {
    expect(core.effectiveLevel({ level: 3, prestige: 2 })).toBe('3+2');
  });
});

describe('addXp', () => {
  test('increases XP without leveling up', () => {
    const pet = makePet({ level: 1, xp: 0 });
    const result = core.addXp(pet, 10, 'test');
    expect(result.xp).toBe(10);
    expect(result.level).toBe(1);
  });

  test('levels up when crossing threshold', () => {
    const pet = makePet({ level: 1, xp: 15 });
    const result = core.addXp(pet, 10, 'test');
    expect(result.level).toBe(2);  // 25 >= 20
    expect(result.xp).toBe(25);
  });

  test('multi-level-up in one addXp call', () => {
    const pet = makePet({ level: 1, xp: 0 });
    const result = core.addXp(pet, 100, 'test');
    // 100 XP → should reach level 6 (need 100 total for level 6)
    expect(result.level).toBeGreaterThanOrEqual(5);
  });

  test('prestiges when crossing level 20', () => {
    const pet = makePet({ level: 19, xp: 940, stats: { debug: 50, patience: 50, chaos: 50, wisdom: 50, snark: 50 } });
    const result = core.addXp(pet, 200, 'test');
    expect(result.level).toBe(1);
    expect(result.xp).toBe(0);
    expect(result.prestige).toBe(1);
    expect(result.stats.debug).toBe(55);
  });

  test('prestiges a pet already sitting at max level on the next XP event', () => {
    const pet = makePet({ level: 20, xp: 1000, prestige: 0, stats: { debug: 50, patience: 50, chaos: 50, wisdom: 50, snark: 50 } });
    const result = core.addXp(pet, 50, 'test');
    expect(result.xp).toBe(0);
    expect(result.level).toBe(1);
    expect(result.prestige).toBe(1);
    expect(result.stats.wisdom).toBe(55);
  });
});

describe('evolvePet', () => {
  test('does nothing below level 15', () => {
    const pet = makePet({ level: 14 });
    const result = core.evolvePet(pet);
    expect(result.evolvedForm).toBeNull();
  });

  test('does nothing if already evolved', () => {
    const pet = makePet({ level: 15, evolvedForm: '智龙', evolutionPath: 'sage' });
    const result = core.evolvePet(pet);
    expect(result.evolvedForm).toBe('智龙');
  });

  test('evolves at level 15 with highest stat determining path', () => {
    const pet = makePet({ level: 15, stats: { debug: 30, patience: 40, chaos: 20, wisdom: 80, snark: 25 } });
    const result = core.evolvePet(pet);
    expect(result.evolvedForm).toBeTruthy();
    expect(result.evolutionPath).toBe('sage');  // wisdom is highest
    expect(result.speciesName).toContain('智');
    // All stats should get +10
    expect(result.stats.wisdom).toBe(90);
    expect(result.stats.debug).toBe(40);
  });
});

describe('prestigePet', () => {
  test('does nothing below level 20', () => {
    const pet = makePet({ level: 19 });
    const result = core.prestigePet(pet);
    expect(result.level).toBe(19);
    expect(result.prestige).toBe(0);
  });

  test('resets to level 1 and increments prestige', () => {
    const pet = makePet({ level: 20, xp: 1000, prestige: 0, stats: { debug: 50, patience: 50, chaos: 50, wisdom: 50, snark: 50 } });
    const result = core.prestigePet(pet);
    expect(result.level).toBe(1);
    expect(result.xp).toBe(0);
    expect(result.prestige).toBe(1);
    // Stats get +5 permanent bonus
    expect(result.stats.debug).toBe(55);
  });

  test('keeps evolved form across prestige', () => {
    const pet = makePet({ level: 20, evolvedForm: '智龙', evolutionPath: 'sage', prestige: 0 });
    const result = core.prestigePet(pet);
    expect(result.evolvedForm).toBe('智龙');
    expect(result.evolutionPath).toBe('sage');
  });

  test('stacks multiple prestige cycles', () => {
    let pet = makePet({ level: 20, prestige: 1, stats: { debug: 60, patience: 55, chaos: 50, wisdom: 65, snark: 45 } });
    const result = core.prestigePet(pet);
    expect(result.prestige).toBe(2);
    expect(result.stats.debug).toBe(65);
  });
});

// ── Species data functions ──

describe('getEvolutionPath (from species.js)', () => {
  const { getEvolutionPath } = require('../src/data/species');

  test('returns sage path for wisdom-highest pet', () => {
    const pet = { stats: { debug: 10, patience: 20, chaos: 15, wisdom: 80, snark: 30 } };
    const path = getEvolutionPath(pet);
    expect(path.id).toBe('sage');
    expect(path.label).toBe('智');
  });

  test('returns valor for debug-highest', () => {
    const pet = { stats: { debug: 90, patience: 10, chaos: 15, wisdom: 20, snark: 30 } };
    const path = getEvolutionPath(pet);
    expect(path.id).toBe('valor');
  });

  test('defaults to valor when all stats tied at zero', () => {
    const pet = { stats: { debug: 0, patience: 0, chaos: 0, wisdom: 0, snark: 0 } };
    const path = getEvolutionPath(pet);
    // 0 > 0 is false for all, maxStat stays 'debug' → EVOLUTION_PATHS.debug.id = 'valor'
    expect(path.id).toBe('valor');
  });
});

describe('getEvolvedName (from species.js)', () => {
  const { getEvolvedName } = require('../src/data/species');

  test('returns evolved name for known combinations', () => {
    expect(getEvolvedName('dragon', 'sage')).toBe('智龙');
    expect(getEvolvedName('cat', 'valor')).toBe('剑猫');
    expect(getEvolvedName('phoenix', 'storm')).toBe('雷凤');
  });

  test('returns fallback for unknown combination', () => {
    expect(getEvolvedName('newspecies', 'sage')).toBe('sage newspecies');
  });
});

describe('applyEvolvedArt (from species.js)', () => {
  const { applyEvolvedArt, EVOLVED_ART_MODIFIERS } = require('../src/data/species');

  test('valor adds sword to first line', () => {
    const base = ['  /^\\  ', ' < · · >'];
    const result = applyEvolvedArt(base, 'valor');
    expect(result[0]).toContain('⚔');
  });

  test('zen adds aura to all lines', () => {
    const base = ['  /^\\  ', ' < · · >'];
    const result = applyEvolvedArt(base, 'zen');
    result.forEach(line => expect(line.startsWith('≋')).toBe(true));
  });

  test('returns base art for unknown path', () => {
    const base = ['  /^\\  '];
    const result = applyEvolvedArt(base, 'unknown');
    expect(result).toEqual(base);
  });
});

// ── Session tracking ──

describe('updateSessionForTool', () => {
  // Import the function directly (it's not exported but tested via onToolUse)
  // We test through the exported onToolUse instead

  test('onToolUse tracks consecutive errors', () => {
    storage._setSession({ ...defaultSessionState(), consecutiveErrors: 2 });
    const pet = makePet({ level: 5 });
    const result = core.onToolUse(pet, 'bash', 'test.js', { failed: true });
    // Session should now have 3 consecutive errors
    const sessionArg = storage.writeSession.mock.calls[0][0];
    expect(sessionArg.consecutiveErrors).toBe(3);
  });

  test('onToolUse resets errors on success after failure', () => {
    storage._setSession({ ...defaultSessionState(), consecutiveErrors: 2 });
    const pet = makePet({ level: 5 });
    const result = core.onToolUse(pet, 'write', 'test.js', { failed: false });
    const sessionArg = storage.writeSession.mock.calls[0][0];
    expect(sessionArg.consecutiveErrors).toBe(0);
    expect(sessionArg.lastRecoveryAt).toBeTruthy();
  });

  test('onToolUse detects test commands', () => {
    const pet = makePet({ level: 5 });
    core.onToolUse(pet, 'bash', 'test.js', { command: 'npm test' });
    const sessionArg = storage.writeSession.mock.calls[0][0];
    expect(sessionArg.lastTestStatus).toBe('green');
  });

  test('onToolUse flags failed test', () => {
    const pet = makePet({ level: 5 });
    core.onToolUse(pet, 'bash', 'test.js', { command: 'npm test', failed: true });
    const sessionArg = storage.writeSession.mock.calls[0][0];
    expect(sessionArg.lastTestStatus).toBe('red');
  });
});

describe('generatePet determinism', () => {
  test('same username always generates same species', () => {
    const pet1 = core.generatePet('deterministic_user');
    storage._reset();
    const pet2 = core.generatePet('deterministic_user');
    expect(pet1.species).toBe(pet2.species);
    expect(pet1.rarity).toBe(pet2.rarity);
    expect(pet1.shiny).toBe(pet2.shiny);
    expect(pet1.name).toBe(pet2.name);
    expect(pet1.stats).toEqual(pet2.stats);
  });

  test('different usernames may generate different species', () => {
    const pet1 = core.generatePet('user_alpha');
    storage._reset();
    const pet2 = core.generatePet('user_beta');
    // At minimum they should have different stats
    expect(pet1.name).not.toBe(pet2.name);
  });

  test('new pet starts at level 1', () => {
    const pet = core.generatePet('new_user');
    expect(pet.level).toBe(1);
    expect(pet.xp).toBe(0);
    expect(pet.mood).toBe('happy');
    expect(pet.energy).toBe(100);
    expect(pet.hunger).toBe(0);
  });
});

// Regression: getOrCreatePet must not overwrite existing pet on transient read failure
describe('getOrCreatePet safety', () => {
  test('does not generate new pet when file exists but readPet returns null', () => {
    const fs = require('fs');
    const os = require('os');
    const path = require('path');

    // Create a real temp directory with a pet.json to simulate "file exists"
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'buddy-test-'));
    const petJsonPath = path.join(tmpDir, 'pet.json');
    fs.writeFileSync(petJsonPath, '{"level":5,"xp":200,"name":"Test"}');

    // Redirect getBuddyHome to our temp dir
    storage.getBuddyHome.mockReturnValue(tmpDir);
    // Simulate transient read failure
    storage.readPet.mockReturnValue(null);
    // Reset writePet call count
    storage.writePet.mockClear();

    const result = core.getOrCreatePet('test-user');

    // Should NOT have generated a new pet (no writePet call)
    expect(storage.writePet).not.toHaveBeenCalled();
    // Should return null since read failed but file exists
    expect(result).toBeNull();

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('generates pet when file truly does not exist', () => {
    const fs = require('fs');
    const os = require('os');
    const path = require('path');

    // Use a temp dir that has NO pet.json
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'buddy-test-'));
    storage.getBuddyHome.mockReturnValue(tmpDir);
    storage.readPet.mockReturnValue(null);
    storage.writePet.mockClear();

    const result = core.getOrCreatePet('test-user');

    // Should have generated a new pet
    expect(storage.writePet).toHaveBeenCalled();
    expect(result).not.toBeNull();
    expect(result.level).toBe(1);

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

// ── Helpers ──

function makePet(overrides = {}) {
  return {
    species: 'dragon',
    speciesName: 'Dragon',
    speciesEmoji: '🐉',
    rarity: 'rare',
    shiny: false,
    hat: null,
    name: '火火',
    level: 5,
    xp: 100,
    xpToNext: 40,
    stats: { debug: 33, patience: 28, chaos: 46, wisdom: 60, snark: 38 },
    mood: 'happy',
    hunger: 20,
    energy: 80,
    streak: 1,
    toolUseCount: 0,
    petXpToday: 0,
    statsXpToday: 0,
    sessionStartXpToday: false,
    prestige: 0,
    evolvedForm: null,
    evolutionPath: null,
    createdAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
    ...overrides,
  };
}

function defaultSessionState() {
  return {
    mode: 'focus',
    currentTask: '',
    consecutiveErrors: 0,
    lastFailureAt: null,
    lastRecoveryAt: null,
    lastActivityAt: null,
    recentTools: [],
    recentEvents: [],
  };
}
