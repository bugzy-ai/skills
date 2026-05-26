import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock all command modules before importing CLI
vi.mock('../src/commands/task', () => ({
  searchTasks: vi.fn(),
  getTask: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  commentTask: vi.fn(),
}));

vi.mock('../src/commands/space', () => ({
  listSpaces: vi.fn(),
}));

vi.mock('../src/commands/list', () => ({
  listLists: vi.fn(),
}));

vi.mock('../src/commands/status', () => ({
  listStatuses: vi.fn(),
}));

vi.mock('../src/commands/workspace', () => ({
  listWorkspaces: vi.fn(),
}));

import { searchTasks, getTask, createTask, updateTask, commentTask } from '../src/commands/task';
import { listSpaces } from '../src/commands/space';
import { listLists } from '../src/commands/list';
import { listStatuses } from '../src/commands/status';
import { listWorkspaces } from '../src/commands/workspace';

const mockedSearchTasks = vi.mocked(searchTasks);
const mockedGetTask = vi.mocked(getTask);
const mockedCreateTask = vi.mocked(createTask);
const mockedUpdateTask = vi.mocked(updateTask);
const mockedCommentTask = vi.mocked(commentTask);
const mockedListSpaces = vi.mocked(listSpaces);
const mockedListLists = vi.mocked(listLists);
const mockedListStatuses = vi.mocked(listStatuses);
const mockedListWorkspaces = vi.mocked(listWorkspaces);

async function runCli(args: string[]) {
  const originalArgv = process.argv;
  process.argv = ['node', 'clickup-cli', ...args];

  vi.resetModules();

  // Re-mock after resetModules
  vi.doMock('../src/commands/task', () => ({
    searchTasks: mockedSearchTasks,
    getTask: mockedGetTask,
    createTask: mockedCreateTask,
    updateTask: mockedUpdateTask,
    commentTask: mockedCommentTask,
  }));

  vi.doMock('../src/commands/space', () => ({
    listSpaces: mockedListSpaces,
  }));

  vi.doMock('../src/commands/list', () => ({
    listLists: mockedListLists,
  }));

  vi.doMock('../src/commands/status', () => ({
    listStatuses: mockedListStatuses,
  }));

  vi.doMock('../src/commands/workspace', () => ({
    listWorkspaces: mockedListWorkspaces,
  }));

  try {
    await import('../src/cli');
  } finally {
    process.argv = originalArgv;
  }
}

describe('CLI', () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(() => {
    exitSpy.mockRestore();
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('help', () => {
    it('prints help with no args', async () => {
      await runCli([]);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('clickup-cli'));
      expect(exitSpy).toHaveBeenCalledWith(0);
    });

    it('prints help with --help flag', async () => {
      await runCli(['--help']);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('clickup-cli'));
      expect(exitSpy).toHaveBeenCalledWith(0);
    });

    it('prints help with -h flag', async () => {
      await runCli(['-h']);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('clickup-cli'));
      expect(exitSpy).toHaveBeenCalledWith(0);
    });
  });

  describe('unknown commands', () => {
    it('exits 1 for unknown resource', async () => {
      await runCli(['unknown']);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown resource'));
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('exits 1 for unknown action', async () => {
      await runCli(['task', 'unknown']);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown action'));
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('task commands', () => {
    it('dispatches task search with all options', async () => {
      mockedSearchTasks.mockResolvedValue();
      await runCli([
        'task', 'search',
        '--query', 'login bug',
        '--space', 'space1',
        '--list', 'list1',
        '--status', 'in progress',
        '--assignee', '123',
        '--limit', '10',
        '--page', '2',
      ]);
      expect(mockedSearchTasks).toHaveBeenCalledWith({
        query: 'login bug',
        space: 'space1',
        list: 'list1',
        status: 'in progress',
        assignee: '123',
        limit: '10',
        page: '2',
      });
    });

    it('dispatches task get with task ID', async () => {
      mockedGetTask.mockResolvedValue();
      await runCli(['task', 'get', 'abc123']);
      expect(mockedGetTask).toHaveBeenCalledWith('abc123');
    });

    it('dispatches task create with options', async () => {
      mockedCreateTask.mockResolvedValue();
      await runCli([
        'task', 'create',
        '--list', 'list1',
        '--name', 'Bug: Login fails',
        '--description', 'Steps to reproduce...',
        '--priority', '2',
        '--status', 'Open',
        '--assignee', '456',
      ]);
      expect(mockedCreateTask).toHaveBeenCalledWith({
        list: 'list1',
        name: 'Bug: Login fails',
        description: 'Steps to reproduce...',
        priority: '2',
        status: 'Open',
        assignee: '456',
      });
    });

    it('dispatches task update with task ID and options', async () => {
      mockedUpdateTask.mockResolvedValue();
      await runCli([
        'task', 'update', 'abc123',
        '--status', 'closed',
        '--priority', '1',
      ]);
      expect(mockedUpdateTask).toHaveBeenCalledWith('abc123', {
        name: undefined,
        description: undefined,
        status: 'closed',
        priority: '1',
        assignee: undefined,
      });
    });

    it('dispatches task comment with task ID and body', async () => {
      mockedCommentTask.mockResolvedValue();
      await runCli([
        'task', 'comment', 'abc123',
        '--body', 'Test evidence: all pass',
      ]);
      expect(mockedCommentTask).toHaveBeenCalledWith('abc123', 'Test evidence: all pass');
    });
  });

  describe('space commands', () => {
    it('dispatches space list', async () => {
      mockedListSpaces.mockResolvedValue();
      await runCli(['space', 'list']);
      expect(mockedListSpaces).toHaveBeenCalled();
    });
  });

  describe('list commands', () => {
    it('dispatches list list with space ID', async () => {
      mockedListLists.mockResolvedValue();
      await runCli(['list', 'list', '--space', 'space1']);
      expect(mockedListLists).toHaveBeenCalledWith('space1');
    });
  });

  describe('status commands', () => {
    it('dispatches status list with list ID', async () => {
      mockedListStatuses.mockResolvedValue();
      await runCli(['status', 'list', '--list', 'list1']);
      expect(mockedListStatuses).toHaveBeenCalledWith('list1');
    });
  });

  describe('workspace commands', () => {
    it('dispatches workspace list', async () => {
      mockedListWorkspaces.mockResolvedValue();
      await runCli(['workspace', 'list']);
      expect(mockedListWorkspaces).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('outputs JSON error to stderr and exits 1 when command throws', async () => {
      mockedSearchTasks.mockRejectedValue(new Error('CLICKUP_API_TOKEN is required'));
      await runCli(['task', 'search', '--query', 'test']);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        JSON.stringify({ error: 'CLICKUP_API_TOKEN is required' })
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});
