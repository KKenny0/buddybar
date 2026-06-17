#!/usr/bin/env node
/**
 * buddy-statusline — Claude Code statusline segment.
 * Shows pet state, rhythm coach signals, and level-gated features.
 * All output is purely visual — nothing is injected into conversation context.
 */

const { getOrCreatePet } = require('../core');
const { ensureSetup, readSession, readConfig } = require('../storage');
const { colors, renderStatusline } = require('../statusline');
const { readContextForAdapter, workspaceInfoForAdapter } = require('../cli-adapters');

async function main() {
  ensureSetup();
  const adapterName = process.env.BUDDYBAR_CLI || 'claude';
  const ctx = await readContextForAdapter(adapterName, process.stdin);

  const config = readConfig();
  const session = readSession();
  const mode = session.mode || config.liveMode || 'focus';
  const pet = getOrCreatePet(process.env.USER || 'anonymous');

  const wsInfo = workspaceInfoForAdapter(adapterName, ctx, { cwd: process.cwd() });

  if (!pet) {
    // Pet data unavailable (corrupted or locked). Show minimal statusline.
    const folder = wsInfo.folder || '';
    const branch = wsInfo.branch || '';
    const parts = [folder, branch].filter(Boolean);
    if (parts.length) {
      process.stdout.write(`${colors.dim}${parts.join(' · ')}${colors.reset}`);
    } else {
      process.stdout.write(`${colors.dim}buddy${colors.reset}`);
    }
    return;
  }

  const line = renderStatusline(pet, session, mode, wsInfo);
  process.stdout.write(line);
}

if (require.main === module) {
  main().catch(() => {
    process.stdout.write('buddy: unavailable');
  });
}

// Export for testing
if (typeof module !== 'undefined') {
  module.exports = { main };
}
