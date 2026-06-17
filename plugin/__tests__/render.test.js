const { renderDetailCard, stripAnsi, validateFrameWidth } = require('../src/render');

function makePet(overrides = {}) {
  return {
    species: 'duck',
    speciesName: 'Duck',
    speciesEmoji: '🦆',
    rarity: 'common',
    shiny: false,
    hat: null,
    name: '小黄',
    level: 3,
    xp: 55,
    xpToNext: 30,
    stats: { debug: 33, patience: 28, chaos: 46, wisdom: 60, snark: 38 },
    mood: 'happy',
    hunger: 20,
    energy: 80,
    streak: 1,
    prestige: 0,
    evolvedForm: null,
    evolutionPath: null,
    lastReaction: null,
    ...overrides,
  };
}

describe('renderDetailCard', () => {
  test('shows growth details in the detail card', () => {
    const pet = makePet({
      level: 1,
      xp: 0,
      prestige: 2,
      evolvedForm: '智鸭',
      evolutionPath: 'sage',
    });

    const output = renderDetailCard({
      pet,
      session: {},
      config: {},
      width: 76,
      color: false,
    });
    const plain = stripAnsi(output);

    expect(plain).toContain('Path: 📖 Sage / 智');
    expect(plain).toContain('Prestige: ✦2  permanent bonus +10');
    expect(plain).not.toContain('[智鸭]');
    expect(validateFrameWidth(output, 76)).toEqual([]);
  });

  test('shows unevolved and no-prestige details for a new pet', () => {
    const output = renderDetailCard({
      pet: makePet(),
      session: {},
      config: {},
      width: 76,
      color: false,
    });
    const plain = stripAnsi(output);

    expect(plain).toContain('Path: unevolved');
    expect(plain).toContain('Prestige: none');
    expect(validateFrameWidth(output, 76)).toEqual([]);
  });
});
