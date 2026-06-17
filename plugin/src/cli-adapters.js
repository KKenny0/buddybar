const { execSync } = require('child_process');
const path = require('path');

function readStdinJson(input = process.stdin, timeoutMs = 200) {
  return new Promise((resolve) => {
    let settled = false;
    let data = '';
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    input.setEncoding('utf8');
    input.on('data', (chunk) => { data += chunk; });
    input.on('end', () => {
      if (!data.trim()) { finish({}); return; }
      try { finish(JSON.parse(data)); } catch { finish({}); }
    });
    setTimeout(() => finish({}), timeoutMs);
  });
}

function resolveBranch(ctx = {}, options = {}) {
  if (ctx.workspace?.git_worktree) return ctx.workspace.git_worktree;
  if (ctx.branch) return ctx.branch;

  const run = options.execSync || execSync;
  try {
    return run('git branch --show-current', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 2000,
      cwd: options.cwd,
    }).trim() || null;
  } catch {
    return null;
  }
}

function folderName(value) {
  if (!value) return null;
  return path.basename(value);
}

function claudeWorkspaceInfo(ctx = {}, options = {}) {
  return {
    folder: folderName(ctx.cwd || options.cwd),
    branch: resolveBranch(ctx, options),
    ctxPct: ctx.context_window?.used_percentage ?? null,
  };
}

function genericWorkspaceInfo(ctx = {}, options = {}) {
  return {
    folder: folderName(ctx.cwd || options.cwd),
    branch: resolveBranch(ctx, options),
    ctxPct: ctx.ctxPct ?? ctx.contextPct ?? ctx.context_window?.used_percentage ?? null,
  };
}

const ADAPTERS = {
  claude: {
    id: 'claude',
    readContext: readStdinJson,
    workspaceInfo: claudeWorkspaceInfo,
  },
  generic: {
    id: 'generic',
    readContext: readStdinJson,
    workspaceInfo: genericWorkspaceInfo,
  },
};

function getAdapter(name = 'claude') {
  return ADAPTERS[name] || ADAPTERS.claude;
}

async function readContextForAdapter(name, input, timeoutMs) {
  return getAdapter(name).readContext(input, timeoutMs);
}

function workspaceInfoForAdapter(name, ctx, options = {}) {
  return getAdapter(name).workspaceInfo(ctx, options);
}

module.exports = {
  ADAPTERS,
  getAdapter,
  readStdinJson,
  resolveBranch,
  claudeWorkspaceInfo,
  genericWorkspaceInfo,
  readContextForAdapter,
  workspaceInfoForAdapter,
};
