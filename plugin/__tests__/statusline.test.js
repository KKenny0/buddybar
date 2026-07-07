/**
 * Tests for stat-influenced statusline threshold functions.
 * Tests for the side-effect-free statusline renderer.
 */
const { errorThreshold, grindingThreshold, fatigueThresholdMin, grindingFile, contextWindowColor, evolvedAvatar, joinSignalParts, renderStatusline } = require('../src/statusline');
const { Readable } = require('stream');

const { getAdapter, readStdinJson, resolveBranch, workspaceInfoForAdapter } = require('../src/cli-adapters');

describe('evolvedAvatar', () => {
  test('returns species emoji before evolution', () => {
    expect(evolvedAvatar({ speciesEmoji: '🦆' })).toBe('🦆');
  });

  test('prefixes evolution path emoji after evolution', () => {
    expect(evolvedAvatar({ speciesEmoji: '🦆', evolutionPath: 'sage' })).toBe('📖🦆');
    expect(evolvedAvatar({ speciesEmoji: '🦆', evolutionPath: 'zen' })).toBe('🪷🦆');
  });

  test('falls back to species emoji for unknown paths', () => {
    expect(evolvedAvatar({ speciesEmoji: '🦆', evolutionPath: 'unknown' })).toBe('🦆');
  });
});

describe('joinSignalParts', () => {
  test('groups work signals into a single segment', () => {
    const result = joinSignalParts(['ctx 18%', '15h25m']);
    expect(result).toContain('ctx 18%');
    expect(result).toContain('15h25m');
    expect(result).toContain('·');
  });
});

describe('renderStatusline', () => {
  test('renders workspace, buddy avatar, and work signals as three segments', () => {
    const now = Date.now();
    const line = renderStatusline(
      {
        speciesEmoji: '🦆',
        evolutionPath: 'sage',
        mood: 'happy',
        prestige: 1,
        level: 8,
        stats: { debug: 50, patience: 50, chaos: 50, wisdom: 50, snark: 50 },
      },
      {
        consecutiveErrors: 0,
        lastActivityAt: new Date(now).toISOString(),
        recentTools: [
          { tool: 'edit', file: 'src/core.js', timestamp: new Date(now - 90 * 60000).toISOString() },
        ],
      },
      'focus',
      { folder: 'buddybar', branch: 'main', ctxPct: 18 },
    );

    expect(line).toContain('buddybar main');
    expect(line).toContain('📖🦆');
    expect(line).toContain('✦1');
    expect(line).toContain('ctx 18%');
    expect(line.split('|')).toHaveLength(3);
  });
});

describe('errorThreshold', () => {
  test('base threshold at debug=50', () => {
    expect(errorThreshold({ debug: 50 })).toBe(3);
  });

  test('high debug detects errors earlier', () => {
    expect(errorThreshold({ debug: 100 })).toBe(2);
  });

  test('low debug is more tolerant', () => {
    expect(errorThreshold({ debug: 0 })).toBe(4);
  });

  test('clamps minimum at 2', () => {
    expect(errorThreshold({ debug: 150 })).toBe(2);
  });

  test('defaults to debug=50 when no stats', () => {
    expect(errorThreshold()).toBe(3);
    expect(errorThreshold(null)).toBe(3);
    expect(errorThreshold({})).toBe(3);
  });
});

describe('grindingThreshold', () => {
  test('base threshold at patience=50', () => {
    expect(grindingThreshold({ patience: 50 })).toBe(5);
  });

  test('high patience tolerates more grinding', () => {
    expect(grindingThreshold({ patience: 100 })).toBeGreaterThanOrEqual(7);
  });

  test('low patience flags grinding earlier', () => {
    expect(grindingThreshold({ patience: 0 })).toBe(3);
  });

  test('clamps minimum at 3', () => {
    expect(grindingThreshold({ patience: -50 })).toBe(3);
  });

  test('defaults to patience=50 when no stats', () => {
    expect(grindingThreshold()).toBe(5);
    expect(grindingThreshold(null)).toBe(5);
  });
});

describe('fatigueThresholdMin', () => {
  test('base thresholds at wisdom=50', () => {
    const t = fatigueThresholdMin({ wisdom: 50 });
    expect(t.yellow).toBe(60);
    expect(t.red).toBe(120);
  });

  test('high wisdom alerts earlier', () => {
    const t = fatigueThresholdMin({ wisdom: 100 });
    expect(t.yellow).toBeLessThan(60);
    expect(t.red).toBeLessThan(120);
  });

  test('low wisdom alerts later', () => {
    const t = fatigueThresholdMin({ wisdom: 0 });
    expect(t.yellow).toBeGreaterThan(60);
    expect(t.red).toBeGreaterThan(120);
  });

  test('clamps yellow minimum at 30', () => {
    const t = fatigueThresholdMin({ wisdom: 200 });
    expect(t.yellow).toBeGreaterThanOrEqual(30);
  });

  test('clamps red minimum at 60', () => {
    const t = fatigueThresholdMin({ wisdom: 200 });
    expect(t.red).toBeGreaterThanOrEqual(60);
  });

  test('defaults to wisdom=50 when no stats', () => {
    const t = fatigueThresholdMin();
    expect(t.yellow).toBe(60);
    expect(t.red).toBe(120);
  });
});

describe('grindingFile with threshold', () => {
  const makeSession = (tools) => ({ recentTools: tools });

  test('detects grinding at default threshold 5', () => {
    const tools = Array(5).fill({ tool: 'edit', file: 'core.js' });
    expect(grindingFile(makeSession(tools))).toBe('core.js');
  });

  test('does not trigger below threshold', () => {
    const tools = Array(4).fill({ tool: 'edit', file: 'core.js' });
    expect(grindingFile(makeSession(tools))).toBeNull();
  });

  test('custom threshold works', () => {
    const tools = Array(3).fill({ tool: 'edit', file: 'core.js' });
    expect(grindingFile(makeSession(tools), 3)).toBe('core.js');
    expect(grindingFile(makeSession(tools), 5)).toBeNull();
  });

  test('only counts edit/multiedit/write tools', () => {
    const tools = Array(5).fill({ tool: 'read', file: 'core.js' });
    expect(grindingFile(makeSession(tools))).toBeNull();
  });

  test('returns shortest filename component', () => {
    const tools = Array(5).fill({ tool: 'edit', file: 'src/plugins/core.js' });
    expect(grindingFile(makeSession(tools))).toBe('core.js');
  });

  test('returns shortest filename component for Windows paths', () => {
    const tools = Array(5).fill({ tool: 'edit', file: 'D:\\project\\src\\core.js' });
    expect(grindingFile(makeSession(tools))).toBe('core.js');
  });
});

describe('contextWindowColor', () => {
  test('returns null for null/undefined', () => {
    expect(contextWindowColor(null)).toBeNull();
    expect(contextWindowColor(undefined)).toBeNull();
  });

  test('dim for normal usage', () => {
    const result = contextWindowColor(30);
    // should not be null
    expect(result).not.toBeNull();
  });

  test('yellow for >50%', () => {
    const result = contextWindowColor(60);
    expect(result).not.toBeNull();
    // verify it differs from normal (used to be a dim color)
  });

  test('red for >80%', () => {
    const result = contextWindowColor(90);
    expect(result).not.toBeNull();
  });
});

describe('resolveBranch', () => {
  test('returns git_worktree when available', () => {
    const ctx = { workspace: { git_worktree: 'feature-branch' } };
    expect(resolveBranch(ctx)).toBe('feature-branch');
  });

  test('returns null when not in git repo and no worktree', () => {
    // execSync will throw for git in a non-git dir; the function catches and returns null
    const result = resolveBranch({});
    // Can be a branch name if running tests inside a git repo, or null
    expect(typeof result === 'string' || result === null).toBe(true);
  });
});

describe('CLI adapters', () => {
  test('exposes claude and generic adapters', () => {
    expect(getAdapter('claude').id).toBe('claude');
    expect(getAdapter('generic').id).toBe('generic');
  });

  test('maps generic CLI context into renderer workspace info', () => {
    const wsInfo = workspaceInfoForAdapter('generic', {
      cwd: 'D:\\project\\buddybar',
      branch: 'main',
      ctxPct: 42,
    });

    expect(wsInfo).toEqual({
      folder: 'buddybar',
      branch: 'main',
      ctxPct: 42,
    });
  });

  test('maps Claude Code statusline context into renderer workspace info', () => {
    const wsInfo = workspaceInfoForAdapter('claude', {
      cwd: 'D:\\project\\buddybar',
      workspace: { git_worktree: 'feature/statusline' },
      context_window: { used_percentage: 23 },
    });

    expect(wsInfo).toEqual({
      folder: 'buddybar',
      branch: 'feature/statusline',
      ctxPct: 23,
    });
  });

  test('reads piped JSON before fallback timeout', async () => {
    const input = Readable.from(['{"ctxPct":42}']);
    const ctx = await readStdinJson(input, 200);
    expect(ctx).toEqual({ ctxPct: 42 });
  });
});
