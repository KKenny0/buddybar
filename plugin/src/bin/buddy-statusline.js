#!/usr/bin/env node
/**
 * buddy-statusline — Claude Code statusline segment.
 * Shows pet state, rhythm coach signals, and level-gated features.
 * All output is purely visual — nothing is injected into conversation context.
 */

const { execSync } = require('child_process');
const path = require('path');
const { getOrCreatePet } = require('../core');
const { ensureSetup, readSession, readConfig } = require('../storage');
const { colors, renderStatusline } = require('../statusline');

// --- Statusline rendering ---

function readStdinJson() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => {
      if (!data.trim()) { resolve({}); return; }
      try { resolve(JSON.parse(data)); } catch { resolve({}); }
    });
    setTimeout(() => resolve({}), 40);
  });
}

function resolveBranch(ctx) {
  if (ctx.workspace?.git_worktree) return ctx.workspace.git_worktree;
  try {
    return execSync('git branch --show-current', {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 2000
    }).trim() || null;
  } catch { return null; }
}

async function main() {
  ensureSetup();
  const ctx = await readStdinJson();

  const config = readConfig();
  const session = readSession();
  const mode = session.mode || config.liveMode || 'focus';
  const pet = getOrCreatePet(process.env.USER || 'anonymous');

  const wsInfo = {
    folder: ctx.cwd ? path.basename(ctx.cwd) : null,
    branch: resolveBranch(ctx),
    ctxPct: ctx.context_window?.used_percentage ?? null,
  };

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
  module.exports = { readStdinJson, resolveBranch };
}
