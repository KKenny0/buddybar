#!/usr/bin/env node
/**
 * buddy-core — CLI entry point for pet management commands.
 * Usage: buddy-core <command> [args]
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  getOrCreatePet,
  generatePet,
  renamePet,
  onSessionStart,
  onToolUse,
  onError,
  onSessionStop,
  setLiveMode,
  getLiveMode,
  effectiveLevel,
  evolvePet,
  prestigePet,
} = require('../core');
const { readPet, ensureSetup, readSession, readConfig, writeConfig } = require('../storage');
const { renderDetailCard } = require('../render');
const { EVOLUTION_PATHS } = require('../data/species');
const { runDoctor, formatDoctorReport } = require('../doctor');

const args = process.argv.slice(2);
const command = args[0];
const jsonOutput = args.includes('--json');

ensureSetup();

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function commandQuote(value) {
  const text = String(value);
  if (process.platform === 'win32') {
    return `"${text.replace(/"/g, '\\"')}"`;
  }
  return shellQuote(text);
}

function createHookHandler(scriptPath, matcher) {
  return {
    matcher,
    hooks: [
      {
        type: 'command',
        command: `bash ${shellQuote(scriptPath)}`,
      },
    ],
  };
}

function isBuddyHookHandler(handler) {
  if (!handler || !Array.isArray(handler.hooks)) return false;

  return handler.hooks.some((hook) => {
    const command = hook && typeof hook.command === 'string' ? hook.command : '';
    const normalized = command.replace(/\\/g, '/').toLowerCase();
    const hasBuddyScript = (
      normalized.includes('session-start.sh') ||
      normalized.includes('post-tool-use.sh') ||
      normalized.includes('stop.sh')
    );
    return (
      hasBuddyScript &&
      (
        normalized.includes('${claude_plugin_root}/hooks/') ||
        normalized.includes('/buddybar/') ||
        normalized.includes('/claude-buddy/')
      )
    );
  });
}

/**
 * Auto-inject hooks into ~/.claude/settings.json
 * Called after hatch to ensure hooks work without manual config.
 */
function setupHooks(options = {}) {
  const verbose = Boolean(options.verbose);
  const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
  if (!fs.existsSync(settingsPath)) return;

  try {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));

    // Derive hooks directory from this script's location
    const pluginRoot = path.resolve(__dirname, '..', '..');
    const hooksDir = path.join(pluginRoot, 'hooks');

    if (!fs.existsSync(path.join(hooksDir, 'session-start.sh'))) {
      return; // hooks dir not found, skip
    }

    // Build hooks config (Claude Code requires nested format with matchers).
    // Persist absolute paths because ~/.claude/settings.json is global and may
    // not have CLAUDE_PLUGIN_ROOT available when Claude executes the hooks.
    const buddyHooks = {
      SessionStart: [createHookHandler(path.join(hooksDir, 'session-start.sh'), '*')],
      PostToolUse: [createHookHandler(path.join(hooksDir, 'post-tool-use.sh'), '')],
      Stop: [createHookHandler(path.join(hooksDir, 'stop.sh'), '*')],
    };

    if (!settings.hooks) {
      settings.hooks = buddyHooks;
    } else {
      // Merge — don't overwrite other hooks
      for (const [event, handlers] of Object.entries(buddyHooks)) {
        if (!Array.isArray(settings.hooks[event])) {
          settings.hooks[event] = handlers;
          continue;
        }

        // Remove any previously injected BuddyBar handlers, then append one
        // canonical handler for this event.
        settings.hooks[event] = settings.hooks[event].filter((handler) => !isBuddyHookHandler(handler));
        settings.hooks[event].push(...handlers);
      }
    }

    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
    if (verbose) console.log('✅ Hooks auto-configured in ~/.claude/settings.json');
  } catch (err) {
    // Silent fail — hooks setup is best-effort
    if (verbose) console.log('⚠️ Could not auto-configure hooks (you can set them manually)');
  }
}

function maybeSetupHooks() {
  if (command === 'hatch') setupHooks({ verbose: !jsonOutput });
}

maybeSetupHooks();

function emitJson(payload) {
  console.log(JSON.stringify(payload));
}

function currentReactionPayload(pet) {
  return {
    pet: pet ? {
      name: pet.name,
      species: pet.species,
      speciesEmoji: pet.speciesEmoji,
      level: pet.level,
      mood: pet.mood,
    } : null,
    reaction: pet?.lastReaction || null,
    mode: getLiveMode(),
  };
}

function printDetailCard(pet, options = {}) {
  console.log(renderDetailCard({
    pet,
    session: readSession(),
    config: readConfig(),
    width: options.width || 72,
    color: options.color,
  }));
}

function evolutionPathFor(pet) {
  if (!pet?.evolutionPath) return null;
  return Object.values(EVOLUTION_PATHS).find((pathInfo) => pathInfo.id === pet.evolutionPath) || null;
}

function statuslineScriptPath() {
  return path.join(__dirname, 'buddy-statusline.js');
}

function settingsPath() {
  return path.join(os.homedir(), '.claude', 'settings.json');
}

function readClaudeSettings() {
  const file = settingsPath();
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return {};
  }
}

function writeClaudeSettings(settings) {
  const file = settingsPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(settings, null, 2) + '\n');
}

function buddyStatuslineCommand() {
  return `${commandQuote(process.execPath)} ${commandQuote(statuslineScriptPath())}`;
}

function isBuddyStatusline(statusLine) {
  return Boolean(statusLine?.command && String(statusLine.command).includes('buddy-statusline.js'));
}

function installStatusline(options = {}) {
  const forceBuddy = Boolean(options.forceBuddy);
  const settings = readClaudeSettings();
  if (settings.statusLine && !isBuddyStatusline(settings.statusLine) && !forceBuddy) {
    console.log('A non-Buddy statusLine already exists. Re-run with statusline install --force to replace it.');
    return false;
  }
  settings.statusLine = {
    type: 'command',
    command: buddyStatuslineCommand(),
    padding: 0,
  };
  writeClaudeSettings(settings);

  const config = readConfig();
  config.statuslineEnabled = true;
  config.sidebarEnabled = false;
  writeConfig(config);
  return true;
}

function removeStatusline() {
  const settings = readClaudeSettings();
  if (isBuddyStatusline(settings.statusLine)) {
    delete settings.statusLine;
    writeClaudeSettings(settings);
  }
  const config = readConfig();
  config.statuslineEnabled = false;
  writeConfig(config);
  console.log('BuddyBar statusline disabled.');
}

switch (command) {
  case 'hatch': {
    const username = args[1] ?? process.env.USER ?? 'anonymous';
    const pet = generatePet(username);
    if (jsonOutput) emitJson(currentReactionPayload(pet));
    else {
      console.log(`🎉 ${pet.name} the ${pet.rarity} ${pet.speciesName} hatched!`);
      printDetailCard(pet);
    }
    break;
  }

  case 'status': {
    const pet = getOrCreatePet(args[1]);
    if (jsonOutput) emitJson(currentReactionPayload(pet));
    else printDetailCard(pet);
    break;
  }

  case 'rename': {
    const newName = args[1];
    if (!newName) {
      console.error('Usage: buddy-core rename <new-name>');
      process.exit(1);
    }
    const pet = readPet();
    if (!pet) {
      console.error('No pet found. Hatch one first with: buddy-core hatch');
      process.exit(1);
    }
    const updated = renamePet(pet, newName);
    if (jsonOutput) emitJson(currentReactionPayload(updated));
    else console.log(`📝 Renamed to ${updated.name}!`);
    break;
  }

  case 'statusline': {
    const subcommand = args[1] || 'on';
    if (subcommand === 'install' || subcommand === 'on') {
      const installed = installStatusline({ forceBuddy: args.includes('--force') });
      if (installed) {
        setupHooks({ verbose: false });
        console.log(`BuddyBar statusline installed (${getLiveMode()} mode).`);
      }
    } else if (subcommand === 'remove' || subcommand === 'off' || subcommand === 'uninstall') {
      removeStatusline();
    } else {
      console.error('Usage: buddy-core statusline <on|off> [--force]');
      process.exit(1);
    }
    break;
  }

  case 'mode': {
    const modeName = args[1];
    if (!modeName || !['quiet', 'focus', 'lively'].includes(modeName)) {
      console.error('Usage: buddy-core mode <quiet|focus|lively>');
      process.exit(1);
    }
    const mode = setLiveMode(modeName);
    console.log(`BuddyBar mode set to ${mode}.`);
    break;
  }

  // Hidden aliases for backward compatibility
  case 'quiet':
  case 'focus':
  case 'lively': {
    const mode = setLiveMode(command);
    console.log(`BuddyBar mode set to ${mode}.`);
    break;
  }

  case 'live': {
    // Legacy alias: live on/off → statusline on/off
    const subcommand = args[1];
    if (subcommand === 'off') {
      removeStatusline();
    } else {
      installStatusline({ forceBuddy: true });
      setupHooks({ verbose: false });
      console.log(`BuddyBar statusline enabled (${getLiveMode()} mode).`);
    }
    break;
  }

  case 'evolve': {
    const pet = getOrCreatePet(process.env.USER ?? 'anonymous');
    if (pet.evolvedForm) {
      const pathInfo = evolutionPathFor(pet);
      const avatar = pathInfo ? `${pathInfo.emoji}${pet.speciesEmoji}` : pet.speciesEmoji;
      console.log(`${avatar} ${pet.name} has already evolved on the ${pathInfo?.name || pet.evolutionPath} path.`);
      break;
    }
    if (pet.level < 15) {
      console.log(`Evolution unlocks at Lv.15. Current: Lv.${pet.level}. Keep coding!`);
      break;
    }
    evolvePet(pet);
    const updated = readPet();
    if (jsonOutput) emitJson(currentReactionPayload(updated));
    else {
      const pathInfo = evolutionPathFor(updated);
      const avatar = pathInfo ? `${pathInfo.emoji}${updated.speciesEmoji}` : updated.speciesEmoji;
      console.log(`✨ ${updated.name} evolved a new avatar: ${avatar} (${pathInfo?.name || updated.evolutionPath}).`);
      printDetailCard(updated);
    }
    break;
  }

  case 'prestige': {
    const pet = readPet();
    if (!pet) {
      console.error('No pet found. Hatch one first with: buddy-core hatch');
      process.exit(1);
    }
    if (pet.level < 20) {
      console.log(`Prestige unlocks at Lv.20. Current: Lv.${effectiveLevel(pet)}. Keep coding!`);
      break;
    }
    prestigePet(pet);
    const updated = readPet();
    if (jsonOutput) emitJson(currentReactionPayload(updated));
    else {
      console.log(`🌟 ${updated.name} prestiged! Now cycle ${updated.prestige} (Lv.${effectiveLevel(updated)}).`);
      printDetailCard(updated);
    }
    break;
  }

  case 'doctor':
  case 'check': {
    const result = runDoctor();
    if (jsonOutput) emitJson(result);
    else console.log(formatDoctorReport(result));
    if (result.status === 'fail') process.exitCode = 1;
    break;
  }

  // Internal hook handlers
  case 'session-start': {
    const pet = getOrCreatePet(args[1]);
    onSessionStart(pet);
    if (jsonOutput) emitJson(currentReactionPayload(pet));
    break;
  }

  case 'tool-use': {
    const tool = args[1];
    const file = args[2];
    const commandText = args[3] || process.env.TOOL_COMMAND || '';
    if (!tool) {
      console.error('Usage: buddy-core tool-use <tool> [file]');
      process.exit(1);
    }
    const pet = readPet();
    if (!pet) {
      process.exit(0);
    }
    const exitCode = parseInt(process.env.TOOL_EXIT_CODE ?? '0', 10);
    if (exitCode !== 0) {
      onError(pet, tool, { file, command: commandText });
    } else {
      onToolUse(pet, tool, file, { command: commandText });
    }
    if (jsonOutput) emitJson(currentReactionPayload(readPet()));
    break;
  }

  case 'session-stop': {
    const pet = readPet();
    if (!pet) {
      process.exit(0);
    }
    onSessionStop(pet);
    if (jsonOutput) emitJson(currentReactionPayload(pet));
    break;
  }

  default:
    if (!command) {
      const pet = getOrCreatePet(process.env.USER ?? 'anonymous');
      printDetailCard(pet);
    } else {
      console.log(`BuddyBar`);
      console.log('');
      console.log('Commands:');
      console.log('  hatch [username]           Hatch a new pet');
      console.log('  status [username]          Show pet status');
      console.log('  rename <name>              Rename the pet');
      console.log('  statusline on|off          Enable/disable statusline');
      console.log('  mode <quiet|focus|lively>  Set presence mode');
      console.log('  evolve                     Trigger evolution (Lv.15+)');
      console.log('  prestige                   Reset with bonuses (Lv.20+)');
      console.log('  doctor                     Check install and runtime health');
    }
}
