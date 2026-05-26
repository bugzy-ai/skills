import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const ENV_BACKUP = { ...process.env };

// Mock all command modules before importing CLI
vi.mock('../src/commands/file', () => ({
  getFile: vi.fn(),
  getFileMeta: vi.fn(),
  getNodes: vi.fn(),
}));

vi.mock('../src/commands/component', () => ({
  listComponents: vi.fn(),
  getComponent: vi.fn(),
  listComponentSets: vi.fn(),
}));

vi.mock('../src/commands/image', () => ({
  exportImages: vi.fn(),
}));

vi.mock('../src/commands/style', () => ({
  listStyles: vi.fn(),
  getStyle: vi.fn(),
}));

import { getFile, getFileMeta, getNodes } from '../src/commands/file';
import { listComponents, getComponent, listComponentSets } from '../src/commands/component';
import { exportImages } from '../src/commands/image';
import { listStyles, getStyle } from '../src/commands/style';

let main: () => Promise<void>;

let exitCode: number | undefined;
let mockLog: ReturnType<typeof vi.spyOn>;
let mockError: ReturnType<typeof vi.spyOn>;

beforeEach(async () => {
  process.env.FIGMA_ACCESS_TOKEN = 'test-token';
  exitCode = undefined;
  vi.spyOn(process, 'exit').mockImplementation((code?: number | string | null | undefined) => {
    exitCode = typeof code === 'number' ? code : 0;
    throw new Error('process.exit');
  });
  mockLog = vi.spyOn(console, 'log').mockImplementation(() => {});
  mockError = vi.spyOn(console, 'error').mockImplementation(() => {});

  // Reset mocks on command modules
  vi.mocked(getFile).mockReset();
  vi.mocked(getFileMeta).mockReset();
  vi.mocked(getNodes).mockReset();
  vi.mocked(listComponents).mockReset();
  vi.mocked(getComponent).mockReset();
  vi.mocked(listComponentSets).mockReset();
  vi.mocked(exportImages).mockReset();
  vi.mocked(listStyles).mockReset();
  vi.mocked(getStyle).mockReset();
});

afterEach(() => {
  process.env = { ...ENV_BACKUP };
  vi.restoreAllMocks();
});

/**
 * Run the CLI parser/dispatcher with given args
 */
async function runCLI(args: string[]) {
  process.argv = ['node', 'figma-cli', ...args];
  const mod = await import('../src/cli');
  main = mod.main;
  try {
    await main();
  } catch {
    // process.exit throws — expected
  }
}

describe('CLI dispatch', () => {
  // Help
  it('shows help with no args', async () => {
    await runCLI([]);
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('figma-cli'));
    expect(exitCode).toBe(0);
  });

  it('shows help with --help', async () => {
    await runCLI(['--help']);
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('figma-cli'));
    expect(exitCode).toBe(0);
  });

  it('shows help with -h', async () => {
    await runCLI(['-h']);
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('figma-cli'));
    expect(exitCode).toBe(0);
  });

  // Unknown resource/action
  it('reports unknown resource as JSON error', async () => {
    await runCLI(['unknown']);
    expect(mockError).toHaveBeenCalledWith(expect.stringContaining('"error"'));
    expect(exitCode).toBe(1);
  });

  it('reports unknown file action as JSON error', async () => {
    await runCLI(['file', 'unknown']);
    expect(mockError).toHaveBeenCalledWith(expect.stringContaining('"error"'));
    expect(exitCode).toBe(1);
  });

  it('reports unknown component action as JSON error', async () => {
    await runCLI(['component', 'unknown']);
    expect(mockError).toHaveBeenCalledWith(expect.stringContaining('"error"'));
    expect(exitCode).toBe(1);
  });

  it('reports unknown image action as JSON error', async () => {
    await runCLI(['image', 'unknown']);
    expect(mockError).toHaveBeenCalledWith(expect.stringContaining('"error"'));
    expect(exitCode).toBe(1);
  });

  it('reports unknown style action as JSON error', async () => {
    await runCLI(['style', 'unknown']);
    expect(mockError).toHaveBeenCalledWith(expect.stringContaining('"error"'));
    expect(exitCode).toBe(1);
  });

  // File commands
  it('dispatches file get with key', async () => {
    await runCLI(['file', 'get', 'abc123']);
    expect(getFile).toHaveBeenCalledWith('abc123', undefined);
  });

  it('dispatches file get with --depth', async () => {
    await runCLI(['file', 'get', 'abc123', '--depth', '2']);
    expect(getFile).toHaveBeenCalledWith('abc123', '2');
  });

  it('dispatches file meta', async () => {
    await runCLI(['file', 'meta', 'abc123']);
    expect(getFileMeta).toHaveBeenCalledWith('abc123');
  });

  it('dispatches file nodes with --ids', async () => {
    await runCLI(['file', 'nodes', 'abc123', '--ids', '1:2,3:4']);
    expect(getNodes).toHaveBeenCalledWith('abc123', '1:2,3:4', undefined);
  });

  // Component commands
  it('dispatches component list with --file', async () => {
    await runCLI(['component', 'list', '--file', 'abc123']);
    expect(listComponents).toHaveBeenCalledWith('abc123');
  });

  it('dispatches component get with key', async () => {
    await runCLI(['component', 'get', 'comp-key-1']);
    expect(getComponent).toHaveBeenCalledWith('comp-key-1');
  });

  it('dispatches component sets with --file', async () => {
    await runCLI(['component', 'sets', '--file', 'abc123']);
    expect(listComponentSets).toHaveBeenCalledWith('abc123');
  });

  // Image commands
  it('dispatches image export with --ids', async () => {
    await runCLI(['image', 'export', 'abc123', '--ids', '1:2']);
    expect(exportImages).toHaveBeenCalledWith('abc123', '1:2', undefined, undefined);
  });

  it('dispatches image export with --scale and --format', async () => {
    await runCLI(['image', 'export', 'abc123', '--ids', '1:2', '--scale', '2', '--format', 'svg']);
    expect(exportImages).toHaveBeenCalledWith('abc123', '1:2', '2', 'svg');
  });

  // Style commands
  it('dispatches style list with --file', async () => {
    await runCLI(['style', 'list', '--file', 'abc123']);
    expect(listStyles).toHaveBeenCalledWith('abc123');
  });

  it('dispatches style get with key', async () => {
    await runCLI(['style', 'get', 'style-key-1']);
    expect(getStyle).toHaveBeenCalledWith('style-key-1');
  });

  // Error handling
  it('outputs JSON error when command throws', async () => {
    vi.mocked(getFile).mockRejectedValue(new Error('FIGMA_ACCESS_TOKEN environment variable is required'));
    await runCLI(['file', 'get', 'abc123']);
    expect(mockError).toHaveBeenCalledWith(
      expect.stringContaining('FIGMA_ACCESS_TOKEN')
    );
    expect(exitCode).toBe(1);
  });
});
