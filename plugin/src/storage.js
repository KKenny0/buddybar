/**
 * File system utilities for BuddyBar.
 * Handles config directory creation, pet.json read/write, and event logging.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

/** Get the buddy home directory */
function getBuddyHome() {
  if (process.env.BUDDYBAR_HOME) return process.env.BUDDYBAR_HOME;
  return path.join(os.homedir(), '.buddybar');
}

/** Ensure the buddy home directory and all files exist */
function ensureSetup() {
  const home = getBuddyHome();
  if (!fs.existsSync(home)) {
    fs.mkdirSync(home, { recursive: true });
  }
  // Ensure event log exists
  const eventLog = path.join(home, 'events.log');
  if (!fs.existsSync(eventLog)) {
    fs.writeFileSync(eventLog, '');
  }
  // Ensure config exists
  const configPath = path.join(home, 'config.json');
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify({
      sidebarEnabled: false,
      sidebarWidth: 28,
      sidebarHeight: 24,
      liveMode: 'focus',
      statuslineEnabled: false,
    }, null, 2));
  } else {
    const config = readJsonFile(configPath, {});
    let changed = false;
    for (const [key, value] of Object.entries({
      sidebarEnabled: false,
      sidebarWidth: 28,
      sidebarHeight: 24,
      liveMode: 'focus',
      statuslineEnabled: false,
    })) {
      if (config[key] === undefined) {
        config[key] = value;
        changed = true;
      }
    }
    if (changed) fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  }
  // Ensure history exists
  const historyPath = path.join(home, 'history.json');
  if (!fs.existsSync(historyPath)) {
    fs.writeFileSync(historyPath, JSON.stringify([], null, 2));
  }
  // Ensure session exists
  const sessionPath = path.join(home, 'session.json');
  if (!fs.existsSync(sessionPath)) {
    fs.writeFileSync(sessionPath, JSON.stringify(defaultSession(), null, 2));
  }
}

function readJsonFile(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    if (!data.trim()) return fallback;
    return JSON.parse(data);
  } catch {
    return fallback;
  }
}

/** Try to recover a valid JSON object from a corrupted file.
 *  Scans backward for the last valid object boundary. */
function tryRecoverJson(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    if (!data.trim()) return null;

    // Fast path: maybe it parses as-is
    try { return JSON.parse(data); } catch {}

    // Find the closing brace of the top-level object, ignoring trailing garbage
    let depth = 0;
    let lastValidEnd = -1;
    for (let i = 0; i < data.length; i++) {
      if (data[i] === '{') depth++;
      else if (data[i] === '}') {
        depth--;
        if (depth === 0) { lastValidEnd = i + 1; break; }
      }
    }

    if (lastValidEnd > 0) {
      const trimmed = data.slice(0, lastValidEnd);
      try {
        const parsed = JSON.parse(trimmed);
        // Write back the repaired content so next reads succeed
        fs.writeFileSync(filePath, JSON.stringify(parsed, null, 2));
        return parsed;
      } catch {}
    }

    return null;
  } catch {
    return null;
  }
}

function defaultSession() {
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

/** Read pet state from disk */
/** Default fields for missing pet properties (backwards-compatible) */
const PET_DEFAULTS = {
  prestige: 0,
  evolvedForm: null,
  evolutionPath: null,
};

function readPet() {
  const petPath = path.join(getBuddyHome(), 'pet.json');
  if (!fs.existsSync(petPath)) return null;

  // Retry transient read/parse failures (e.g. concurrent write)
  for (let attempt = 0; attempt < 3; attempt++) {
    const pet = readJsonFile(petPath, null);
    if (pet) return { ...PET_DEFAULTS, ...pet };
  }

  // All retries failed — try to recover from truncated JSON
  const recovered = tryRecoverJson(petPath);
  if (recovered) return { ...PET_DEFAULTS, ...recovered };

  // File exists but all read attempts failed
  return null;
}

/** Write pet state to disk (atomic — write to unique temp then rename) */
function writePet(pet) {
  const petPath = path.join(getBuddyHome(), 'pet.json');
  // Use unique temp file to prevent concurrent processes from colliding
  const tmpPath = petPath + '.tmp.' + process.pid + '.' + Date.now();
  fs.writeFileSync(tmpPath, JSON.stringify(pet, null, 2));
  fs.renameSync(tmpPath, petPath);
}

/** Append an event to the event log (auto-truncate at 1MB) */
function logEvent(entry) {
  ensureSetup();
  const eventLog = path.join(getBuddyHome(), 'events.log');
  try {
    const stat = fs.statSync(eventLog);
    if (stat.size > 1048576) fs.writeFileSync(eventLog, '');
  } catch {}
  const line = JSON.stringify(entry) + '\n';
  fs.appendFileSync(eventLog, line);
}

/** Read config */
function readConfig() {
  const configPath = path.join(getBuddyHome(), 'config.json');
  return readJsonFile(configPath, {});
}

/** Write config */
function writeConfig(config) {
  const configPath = path.join(getBuddyHome(), 'config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

/** Read history */
function readHistory() {
  const historyPath = path.join(getBuddyHome(), 'history.json');
  return readJsonFile(historyPath, []);
}

/** Append history entry */
function appendHistory(entry) {
  const history = readHistory();
  history.push(entry);
  const historyPath = path.join(getBuddyHome(), 'history.json');
  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
}

/** Read session state */
function readSession() {
  const sessionPath = path.join(getBuddyHome(), 'session.json');
  const session = readJsonFile(sessionPath, defaultSession());
  return { ...defaultSession(), ...session };
}

/** Write session state (atomic — unique temp then rename) */
function writeSession(session) {
  const sessionPath = path.join(getBuddyHome(), 'session.json');
  const tmpPath = sessionPath + '.tmp.' + process.pid + '.' + Date.now();
  fs.writeFileSync(tmpPath, JSON.stringify({ ...defaultSession(), ...session }, null, 2));
  fs.renameSync(tmpPath, sessionPath);
}

/** Append a compact event to session history */
function rememberSessionEvent(session, event) {
  const next = { ...defaultSession(), ...session };
  next.recentEvents = Array.isArray(next.recentEvents) ? next.recentEvents : [];
  next.recentEvents.push(event);
  next.recentEvents = next.recentEvents.slice(-12);
  return next;
}

module.exports = {
  getBuddyHome,
  ensureSetup,
  defaultSession,
  readPet,
  writePet,
  logEvent,
  readConfig,
  writeConfig,
  readHistory,
  appendHistory,
  readSession,
  writeSession,
  rememberSessionEvent,
};
