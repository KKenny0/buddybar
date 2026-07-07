const fs = require('fs');
const path = require('path');

const hookDir = path.join(__dirname, '..', 'hooks');
const hookFiles = ['session-start.sh', 'post-tool-use.sh', 'stop.sh'];
const oldDataDir = ['.claude', '-buddy'].join('');

function readHook(name) {
  return fs.readFileSync(path.join(hookDir, name), 'utf8');
}

describe('BuddyBar hooks', () => {
  test('use the BuddyBar data namespace and LF line endings', () => {
    for (const file of hookFiles) {
      const content = readHook(file);
      expect(content).toContain('.buddybar');
      expect(content).not.toContain(oldDataDir);
      expect(content).not.toContain('\r\n');
    }
  });

  test('do not let Windows home lookup consume Claude hook stdin', () => {
    for (const file of hookFiles) {
      expect(readHook(file)).toContain('cmd.exe /c echo %USERPROFILE% </dev/null');
    }
  });

  test('post-tool-use parses stdin with the selected Node runtime', () => {
    const content = readHook('post-tool-use.sh');
    expect(content).toContain('JSON_NODE="node.exe"');
    expect(content).toContain('"$JSON_NODE" -e');
    expect(content).not.toContain('| node -e');
  });
});
