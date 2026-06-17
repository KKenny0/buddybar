const fs = require('fs');
const path = require('path');
const os = require('os');

const { getBuddyHome, ensureSetup } = require('./storage');
const { renderStatusline } = require('./statusline');

function readJsonSafe(filePath) {
  try {
    if (!fs.existsSync(filePath)) return { ok: false, error: 'missing' };
    return { ok: true, value: JSON.parse(fs.readFileSync(filePath, 'utf8')) };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function addCheck(checks, status, label, detail) {
  checks.push({ status, label, detail });
}

function shortPath(filePath, homeDir) {
  const home = homeDir || os.homedir();
  return String(filePath).startsWith(home) ? `~${String(filePath).slice(home.length)}` : String(filePath);
}

function statusFromChecks(checks) {
  if (checks.some((check) => check.status === 'fail')) return 'fail';
  if (checks.some((check) => check.status === 'warn')) return 'warn';
  return 'pass';
}

function checkBuddyData(checks, homeDir, buddyHomeOverride) {
  if (!buddyHomeOverride) ensureSetup();
  const buddyHome = buddyHomeOverride || getBuddyHome();
  const files = [
    ['config', 'config.json', true],
    ['session', 'session.json', true],
    ['history', 'history.json', true],
    ['events', 'events.log', false],
  ];

  for (const [label, name, json] of files) {
    const filePath = path.join(buddyHome, name);
    if (!fs.existsSync(filePath)) {
      addCheck(checks, 'fail', `${label} file`, `${shortPath(filePath, homeDir)} is missing`);
      continue;
    }
    if (json) {
      const parsed = readJsonSafe(filePath);
      addCheck(
        checks,
        parsed.ok ? 'pass' : 'fail',
        `${label} file`,
        parsed.ok ? `${shortPath(filePath, homeDir)} is readable` : `${shortPath(filePath, homeDir)} is invalid JSON`,
      );
    } else {
      addCheck(checks, 'pass', `${label} file`, `${shortPath(filePath, homeDir)} exists`);
    }
  }

  const petPath = path.join(buddyHome, 'pet.json');
  if (!fs.existsSync(petPath)) {
    addCheck(checks, 'warn', 'pet file', 'No pet yet. Run /buddybar:buddy hatch.');
  } else {
    const pet = readJsonSafe(petPath);
    addCheck(checks, pet.ok ? 'pass' : 'fail', 'pet file', pet.ok ? 'pet.json is readable' : 'pet.json is invalid JSON');
  }
}

function checkRenderer(checks) {
  try {
    const line = renderStatusline(
      {
        speciesEmoji: '🦆',
        evolutionPath: 'sage',
        mood: 'happy',
        prestige: 1,
        level: 8,
        stats: { debug: 50, patience: 50, chaos: 50, wisdom: 50, snark: 50 },
      },
      { recentTools: [], consecutiveErrors: 0 },
      'focus',
      { folder: 'project', branch: 'main', ctxPct: 23 },
    );
    const ok = line.includes('📖🦆') && line.includes('✦1') && line.includes('ctx 23%');
    addCheck(checks, ok ? 'pass' : 'fail', 'statusline renderer', ok ? 'avatar, prestige, and ctx render' : 'renderer output is missing expected parts');
  } catch (err) {
    addCheck(checks, 'fail', 'statusline renderer', err.message);
  }
}

function checkClaudeStatusline(checks, homeDir) {
  const settingsPath = path.join(homeDir, '.claude', 'settings.json');
  const settings = readJsonSafe(settingsPath);
  if (!settings.ok) {
    addCheck(checks, 'warn', 'Claude settings', `Cannot read ${shortPath(settingsPath, homeDir)}`);
    return;
  }

  const command = settings.value?.statusLine?.command;
  if (!command) {
    addCheck(checks, 'warn', 'Claude statusline', 'No statusLine command configured. Run /buddybar:buddy statusline on.');
    return;
  }
  if (!String(command).includes('buddy-statusline.js')) {
    addCheck(checks, 'warn', 'Claude statusline', 'A non-BuddyBar statusLine is configured.');
    return;
  }

  const match = String(command).match(/"([^"]*buddy-statusline\.js)"|'([^']*buddy-statusline\.js)'|(\S*buddy-statusline\.js)/);
  const scriptPath = match && (match[1] || match[2] || match[3]);
  if (scriptPath && fs.existsSync(scriptPath)) {
    addCheck(checks, 'pass', 'Claude statusline', `uses ${shortPath(scriptPath, homeDir)}`);
  } else {
    addCheck(checks, 'fail', 'Claude statusline', `configured script is missing: ${scriptPath || command}`);
  }
}

function checkPluginInstall(checks, homeDir) {
  const installedPath = path.join(homeDir, '.claude', 'plugins', 'installed_plugins.json');
  const installed = readJsonSafe(installedPath);
  if (!installed.ok) {
    addCheck(checks, 'warn', 'plugin install', `Cannot read ${shortPath(installedPath, homeDir)}`);
    return;
  }

  const pluginEntries = Object.entries(installed.value?.plugins || {})
    .filter(([id]) => id.startsWith('buddybar@'));

  if (pluginEntries.length === 0) {
    addCheck(checks, 'warn', 'plugin install', 'buddybar is not listed as installed.');
    return;
  }

  for (const [id, entries] of pluginEntries) {
    for (const entry of entries) {
      const installPath = entry.installPath || '';
      const exists = installPath && fs.existsSync(installPath);
      const identityDetail = `${id} -> ${entry.version || 'unknown version'}`;
      addCheck(checks, exists ? 'pass' : 'fail', 'plugin install', exists ? identityDetail : `${identityDetail}, but installPath is missing`);

      if (id !== 'buddybar@buddybar') {
        addCheck(checks, 'warn', 'plugin identity', `Installed as ${id}. Use /plugin update ${id}, or reinstall the marketplace under the buddybar name.`);
      }

      if (entry.version && entry.gitCommitSha && !String(entry.gitCommitSha).startsWith(String(entry.version))) {
        addCheck(checks, 'warn', 'plugin metadata', `version ${entry.version} does not match gitCommitSha ${String(entry.gitCommitSha).slice(0, 12)}; clean reinstall if update behavior looks stale.`);
      }
    }
  }
}

function runDoctor(options = {}) {
  const homeDir = options.homeDir || os.homedir();
  const buddyHome = options.buddyHome;
  const checks = [];

  checkBuddyData(checks, homeDir, buddyHome);
  checkRenderer(checks);
  checkClaudeStatusline(checks, homeDir);
  checkPluginInstall(checks, homeDir);

  return {
    status: statusFromChecks(checks),
    checks,
  };
}

function formatDoctorReport(result) {
  const icon = { pass: 'OK', warn: 'WARN', fail: 'FAIL' };
  const lines = [`BuddyBar self-check: ${result.status.toUpperCase()}`];
  for (const check of result.checks) {
    lines.push(`[${icon[check.status] || check.status}] ${check.label}: ${check.detail}`);
  }
  return lines.join('\n');
}

module.exports = {
  runDoctor,
  formatDoctorReport,
};
