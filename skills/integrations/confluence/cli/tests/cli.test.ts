import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const ENV_BACKUP = { ...process.env };

// Mock all command modules before importing CLI
vi.mock('../src/commands/space', () => ({
  listSpaces: vi.fn(),
}));

vi.mock('../src/commands/page', () => ({
  getPage: vi.fn(),
  listChildren: vi.fn(),
}));

vi.mock('../src/commands/search', () => ({
  searchCQL: vi.fn(),
  searchText: vi.fn(),
}));

import { listSpaces } from '../src/commands/space';
import { getPage, listChildren } from '../src/commands/page';
import { searchCQL, searchText } from '../src/commands/search';

// Import main but prevent auto-execution by mocking process.argv before module init
// We need to test dispatch, so we call main() directly
let main: () => Promise<void>;

let exitCode: number | undefined;
let mockLog: ReturnType<typeof vi.spyOn>;
let mockError: ReturnType<typeof vi.spyOn>;

beforeEach(async () => {
  process.env.CONFLUENCE_ACCESS_TOKEN = 'test-token';
  process.env.CONFLUENCE_CLOUD_ID = 'test-cloud-id';
  exitCode = undefined;
  vi.spyOn(process, 'exit').mockImplementation((code?: number | string | null | undefined) => {
    exitCode = typeof code === 'number' ? code : 0;
    throw new Error('process.exit');
  });
  mockLog = vi.spyOn(console, 'log').mockImplementation(() => {});
  mockError = vi.spyOn(console, 'error').mockImplementation(() => {});

  // Reset mocks on command modules
  vi.mocked(listSpaces).mockReset();
  vi.mocked(getPage).mockReset();
  vi.mocked(listChildren).mockReset();
  vi.mocked(searchCQL).mockReset();
  vi.mocked(searchText).mockReset();
});

afterEach(() => {
  process.env = { ...ENV_BACKUP };
  vi.restoreAllMocks();
});

/**
 * Run the CLI parser/dispatcher with given args.
 * We re-import the module to get a fresh main() each time.
 */
async function runCLI(args: string[]) {
  process.argv = ['node', 'confluence-cli', ...args];
  // Dynamic import to get the main function — use resetModules so the module re-executes
  // But we need to prevent the top-level main() call from running uncontrolled.
  // Instead, we parse the same way main() does — inline the dispatch logic.
  // Actually, let's just use the static import and call main directly.
  const mod = await import('../src/cli');
  main = mod.main;
  try {
    await main();
  } catch {
    // process.exit throws — expected
  }
}

describe('CLI dispatch', () => {
  it('shows help with no args', async () => {
    await runCLI([]);
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('confluence-cli'));
    expect(exitCode).toBe(0);
  });

  it('shows help with --help', async () => {
    await runCLI(['--help']);
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('confluence-cli'));
    expect(exitCode).toBe(0);
  });

  it('shows help with -h', async () => {
    await runCLI(['-h']);
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('confluence-cli'));
    expect(exitCode).toBe(0);
  });

  it('reports unknown resource as JSON error', async () => {
    await runCLI(['unknown']);
    expect(mockError).toHaveBeenCalledWith(
      expect.stringContaining('"error"')
    );
    expect(exitCode).toBe(1);
  });

  it('reports unknown action as JSON error', async () => {
    await runCLI(['space', 'unknown']);
    expect(mockError).toHaveBeenCalledWith(
      expect.stringContaining('"error"')
    );
    expect(exitCode).toBe(1);
  });

  it('dispatches space list', async () => {
    await runCLI(['space', 'list']);
    expect(listSpaces).toHaveBeenCalled();
  });

  it('dispatches page get with page-id', async () => {
    await runCLI(['page', 'get', '12345']);
    expect(getPage).toHaveBeenCalledWith('12345');
  });

  it('dispatches page children', async () => {
    await runCLI(['page', 'children', '12345']);
    expect(listChildren).toHaveBeenCalledWith('12345', undefined);
  });

  it('dispatches search --cql', async () => {
    await runCLI(['search', '--cql', 'type = page']);
    expect(searchCQL).toHaveBeenCalledWith('type = page', undefined);
  });

  it('dispatches search --query', async () => {
    await runCLI(['search', '--query', 'login flow']);
    expect(searchText).toHaveBeenCalledWith('login flow', undefined);
  });

  it('errors when search has no --cql or --query', async () => {
    await runCLI(['search']);
    expect(mockError).toHaveBeenCalledWith(
      expect.stringContaining('--cql or --query')
    );
    expect(exitCode).toBe(1);
  });
});
