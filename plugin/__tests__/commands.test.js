const fs = require('fs');
const path = require('path');

describe('buddy command metadata', () => {
  test('argument hint lists only currently supported public commands', () => {
    const commandFile = fs.readFileSync(path.join(__dirname, '..', 'commands', 'buddy.md'), 'utf8');

    const hint = commandFile.match(/^argument-hint: "([^"]+)"/m)?.[1];

    expect(hint).toBe('[status|hatch|rename NAME|statusline on|statusline off|mode MODE|quiet|focus|lively|evolve|prestige|doctor|check]');
    expect(hint).not.toMatch(/\b(feed|play|pet|stats|panel|sidebar|events|summary|unlocks)\b/);
  });
});
