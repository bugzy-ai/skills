import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const ENV_BACKUP = { ...process.env };

// Mock all command modules before importing CLI
vi.mock('../src/commands/search', () => ({
  search: vi.fn(),
}));

vi.mock('../src/commands/page', () => ({
  getPage: vi.fn(),
  createPage: vi.fn(),
  updatePage: vi.fn(),
}));

vi.mock('../src/commands/database', () => ({
  getDatabase: vi.fn(),
  queryDatabase: vi.fn(),
}));

import { search } from '../src/commands/search';
import { getPage, createPage, updatePage } from '../src/commands/page';
import { getDatabase, queryDatabase } from '../src/commands/database';

let main: () => Promise<void>;

let exitCode: number | undefined;
let mockLog: ReturnType<typeof vi.spyOn>;
let mockError: ReturnType<typeof vi.spyOn>;

beforeEach(async () => {
  process.env.NOTION_TOKEN = 'test-token';
  exitCode = undefined;
  vi.spyOn(process, 'exit').mockImplementation((code?: number | string | null | undefined) => {
    exitCode = typeof code === 'number' ? code : 0;
    throw new Error('process.exit');
  });
  mockLog = vi.spyOn(console, 'log').mockImplementation(() => {});
  mockError = vi.spyOn(console, 'error').mockImplementation(() => {});

  vi.mocked(search).mockReset();
  vi.mocked(getPage).mockReset();
  vi.mocked(createPage).mockReset();
  vi.mocked(updatePage).mockReset();
  vi.mocked(getDatabase).mockReset();
  vi.mocked(queryDatabase).mockReset();
});

afterEach(() => {
  process.env = { ...ENV_BACKUP };
  vi.restoreAllMocks();
});

async function runCLI(args: string[]) {
  process.argv = ['node', 'notion-cli', ...args];
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
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('notion-cli'));
    expect(exitCode).toBe(0);
  });

  it('shows help with --help', async () => {
    await runCLI(['--help']);
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('notion-cli'));
    expect(exitCode).toBe(0);
  });

  it('shows help with -h', async () => {
    await runCLI(['-h']);
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('notion-cli'));
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
    await runCLI(['page', 'unknown']);
    expect(mockError).toHaveBeenCalledWith(
      expect.stringContaining('"error"')
    );
    expect(exitCode).toBe(1);
  });

  it('dispatches search --query', async () => {
    await runCLI(['search', '--query', 'test docs']);
    expect(search).toHaveBeenCalledWith('test docs', undefined, undefined);
  });

  it('dispatches search --query with --filter and --limit', async () => {
    await runCLI(['search', '--query', 'test', '--filter', 'page', '--limit', '10']);
    expect(search).toHaveBeenCalledWith('test', 'page', '10');
  });

  it('errors when search has no --query', async () => {
    await runCLI(['search']);
    expect(mockError).toHaveBeenCalledWith(
      expect.stringContaining('--query')
    );
    expect(exitCode).toBe(1);
  });

  it('dispatches page get with page-id', async () => {
    await runCLI(['page', 'get', 'abc-123']);
    expect(getPage).toHaveBeenCalledWith('abc-123');
  });

  it('dispatches page create', async () => {
    await runCLI(['page', 'create', '--parent', 'db-id', '--title', 'New Issue']);
    expect(createPage).toHaveBeenCalledWith('db-id', 'New Issue', undefined);
  });

  it('dispatches page update', async () => {
    await runCLI(['page', 'update', 'page-id', '--properties', '{"Status":"Done"}']);
    expect(updatePage).toHaveBeenCalledWith('page-id', '{"Status":"Done"}');
  });

  it('dispatches database get', async () => {
    await runCLI(['database', 'get', 'db-123']);
    expect(getDatabase).toHaveBeenCalledWith('db-123');
  });

  it('dispatches database query', async () => {
    await runCLI(['database', 'query', 'db-123']);
    expect(queryDatabase).toHaveBeenCalledWith('db-123', undefined, undefined);
  });

  it('dispatches database query with --filter and --limit', async () => {
    await runCLI(['database', 'query', 'db-123', '--filter', '{"property":"Status"}', '--limit', '5']);
    expect(queryDatabase).toHaveBeenCalledWith('db-123', '{"property":"Status"}', '5');
  });
});
