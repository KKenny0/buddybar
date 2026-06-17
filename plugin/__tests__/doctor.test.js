const fs = require('fs');
const os = require('os');
const path = require('path');

const { runDoctor, formatDoctorReport } = require('../src/doctor');

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function makeTempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'buddybar-doctor-'));
}

describe('runDoctor', () => {
  test('reports legacy marketplace identity and stale plugin metadata', () => {
    const root = makeTempRoot();
    const buddyHome = path.join(root, '.claude-buddy');
    const installPath = path.join(root, '.claude', 'plugins', 'cache', 'claude-buddy', 'buddybar', '80b550a64142');
    const statuslinePath = path.join(installPath, 'src', 'bin', 'buddy-statusline.js');

    fs.mkdirSync(path.dirname(statuslinePath), { recursive: true });
    fs.writeFileSync(statuslinePath, '');
    fs.mkdirSync(buddyHome, { recursive: true });
    fs.writeFileSync(path.join(buddyHome, 'events.log'), '');
    writeJson(path.join(buddyHome, 'config.json'), { liveMode: 'focus', statuslineEnabled: true });
    writeJson(path.join(buddyHome, 'session.json'), {});
    writeJson(path.join(buddyHome, 'history.json'), []);
    writeJson(path.join(buddyHome, 'pet.json'), { speciesEmoji: '🦆', mood: 'happy' });

    writeJson(path.join(root, '.claude', 'settings.json'), {
      statusLine: {
        type: 'command',
        command: `"node" "${statuslinePath}"`,
      },
    });

    writeJson(path.join(root, '.claude', 'plugins', 'installed_plugins.json'), {
      version: 2,
      plugins: {
        'buddybar@claude-buddy': [
          {
            installPath,
            version: '80b550a64142',
            gitCommitSha: '32fd5c1385eaede1eb3c4b2e4b376d3774e8f19a',
          },
        ],
      },
    });

    const result = runDoctor({ homeDir: root, buddyHome });
    const report = formatDoctorReport(result);

    expect(result.status).toBe('warn');
    expect(report).toContain('Installed as buddybar@claude-buddy');
    expect(report).toContain('/plugin update buddybar@claude-buddy');
    expect(report).toContain('version 80b550a64142 does not match gitCommitSha 32fd5c1385ea');
  });

  test('fails when configured BuddyBar hook scripts point at missing paths', () => {
    const root = makeTempRoot();
    const buddyHome = path.join(root, '.claude-buddy');
    const installPath = path.join(root, '.claude', 'plugins', 'cache', 'buddybar', 'buddybar', 'abc123');
    const statuslinePath = path.join(installPath, 'src', 'bin', 'buddy-statusline.js');
    const staleHookPath = path.join(root, '.claude', 'plugins', 'marketplaces', 'claude-buddy', 'plugin', 'hooks', 'stop.sh');

    fs.mkdirSync(path.dirname(statuslinePath), { recursive: true });
    fs.writeFileSync(statuslinePath, '');
    fs.mkdirSync(buddyHome, { recursive: true });
    fs.writeFileSync(path.join(buddyHome, 'events.log'), '');
    writeJson(path.join(buddyHome, 'config.json'), { liveMode: 'focus', statuslineEnabled: true });
    writeJson(path.join(buddyHome, 'session.json'), {});
    writeJson(path.join(buddyHome, 'history.json'), []);
    writeJson(path.join(buddyHome, 'pet.json'), { speciesEmoji: '🦆', mood: 'happy' });

    writeJson(path.join(root, '.claude', 'settings.json'), {
      statusLine: {
        type: 'command',
        command: `"node" "${statuslinePath}"`,
      },
      hooks: {
        Stop: [
          {
            matcher: '*',
            hooks: [
              {
                type: 'command',
                command: `bash '${staleHookPath}'`,
              },
            ],
          },
        ],
      },
    });

    writeJson(path.join(root, '.claude', 'plugins', 'installed_plugins.json'), {
      version: 2,
      plugins: {
        'buddybar@buddybar': [
          {
            installPath,
            version: 'abc123',
            gitCommitSha: 'abc123',
          },
        ],
      },
    });

    const result = runDoctor({ homeDir: root, buddyHome });
    const report = formatDoctorReport(result);

    expect(result.status).toBe('fail');
    expect(report).toContain('Claude hooks');
    expect(report).toContain('Missing hook script');
    expect(report).toContain('statusline on --force');
  });
});
