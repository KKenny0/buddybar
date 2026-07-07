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

function toBashPath(filePath) {
  const text = String(filePath);
  const windowsDrive = text.match(/^([A-Za-z]):[\\/](.*)$/);
  if (windowsDrive) {
    return `/mnt/${windowsDrive[1].toLowerCase()}/${windowsDrive[2].replace(/\\/g, '/')}`;
  }
  return text.replace(/\\/g, '/');
}

function writeBuddyData(buddyHome) {
  fs.mkdirSync(buddyHome, { recursive: true });
  fs.writeFileSync(path.join(buddyHome, 'events.log'), '');
  writeJson(path.join(buddyHome, 'config.json'), { liveMode: 'focus', statuslineEnabled: true });
  writeJson(path.join(buddyHome, 'session.json'), {});
  writeJson(path.join(buddyHome, 'history.json'), []);
  writeJson(path.join(buddyHome, 'pet.json'), { speciesEmoji: '🦆', mood: 'happy' });
}

function writeCanonicalInstall(root, installPath, statuslinePath) {
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

  fs.mkdirSync(path.dirname(statuslinePath), { recursive: true });
  fs.writeFileSync(statuslinePath, '');
}

function writeSettings(root, statuslinePath, hookCommand) {
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
              command: hookCommand,
            },
          ],
        },
      ],
    },
  });
}

describe('runDoctor', () => {
  test('passes for the canonical plugin identity and bash-readable hook path', () => {
    const root = makeTempRoot();
    const buddyHome = path.join(root, '.buddybar');
    const installPath = path.join(root, '.claude', 'plugins', 'cache', 'buddybar', 'buddybar', 'abc123');
    const statuslinePath = path.join(installPath, 'src', 'bin', 'buddy-statusline.js');
    const hookPath = path.join(installPath, 'hooks', 'stop.sh');

    writeBuddyData(buddyHome);
    writeCanonicalInstall(root, installPath, statuslinePath);
    fs.mkdirSync(path.dirname(hookPath), { recursive: true });
    fs.writeFileSync(hookPath, '#!/bin/bash\nexit 0\n');
    writeSettings(root, statuslinePath, `bash '${toBashPath(hookPath)}'`);

    const result = runDoctor({ homeDir: root, buddyHome });
    const report = formatDoctorReport(result);

    expect(result.status).toBe('pass');
    expect(report).toContain('plugin install: buddybar@buddybar -> abc123');
    expect(report).toContain('Claude hooks: 1 BuddyBar hook command(s) are reachable');
  });

  const testWindowsPath = process.platform === 'win32' ? test : test.skip;

  testWindowsPath('fails when configured BuddyBar hook command uses a Windows path for bash', () => {
    const root = makeTempRoot();
    const buddyHome = path.join(root, '.buddybar');
    const installPath = path.join(root, '.claude', 'plugins', 'cache', 'buddybar', 'buddybar', 'abc123');
    const statuslinePath = path.join(installPath, 'src', 'bin', 'buddy-statusline.js');
    const hookPath = path.join(installPath, 'hooks', 'stop.sh');

    writeBuddyData(buddyHome);
    writeCanonicalInstall(root, installPath, statuslinePath);
    fs.mkdirSync(path.dirname(hookPath), { recursive: true });
    fs.writeFileSync(hookPath, '#!/bin/bash\nexit 0\n');
    writeSettings(root, statuslinePath, `bash '${hookPath}'`);

    const result = runDoctor({ homeDir: root, buddyHome });
    const report = formatDoctorReport(result);

    expect(result.status).toBe('fail');
    expect(report).toContain('Claude hooks');
    expect(report).toContain('Windows path that bash cannot open');
    expect(report).toContain('statusline on --force');
  });

  test('fails when configured BuddyBar hook scripts use Windows line endings', () => {
    const root = makeTempRoot();
    const buddyHome = path.join(root, '.buddybar');
    const installPath = path.join(root, '.claude', 'plugins', 'cache', 'buddybar', 'buddybar', 'abc123');
    const statuslinePath = path.join(installPath, 'src', 'bin', 'buddy-statusline.js');
    const hookPath = path.join(installPath, 'hooks', 'stop.sh');

    writeBuddyData(buddyHome);
    writeCanonicalInstall(root, installPath, statuslinePath);
    fs.mkdirSync(path.dirname(hookPath), { recursive: true });
    fs.writeFileSync(hookPath, '#!/bin/bash\r\nexit 0\r\n');
    writeSettings(root, statuslinePath, `bash '${toBashPath(hookPath)}'`);

    const result = runDoctor({ homeDir: root, buddyHome });
    const report = formatDoctorReport(result);

    expect(result.status).toBe('fail');
    expect(report).toContain('Claude hooks');
    expect(report).toContain('Windows line endings');
  });
});
