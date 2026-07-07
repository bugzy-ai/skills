import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock all command modules before importing CLI
vi.mock('../src/commands/issue', () => ({
  searchIssues: vi.fn(),
  getIssue: vi.fn(),
  createIssue: vi.fn(),
  updateIssue: vi.fn(),
  commentIssue: vi.fn(),
  transitionIssue: vi.fn(),
}));

vi.mock('../src/commands/project', () => ({
  listProjects: vi.fn(),
}));

vi.mock('../src/commands/field', () => ({
  listFields: vi.fn(),
}));

vi.mock('../src/commands/version', () => ({
  listVersions: vi.fn(),
  ensureVersion: vi.fn(),
}));

import {
  searchIssues,
  getIssue,
  createIssue,
  updateIssue,
  commentIssue,
  transitionIssue,
} from '../src/commands/issue';
import { listProjects } from '../src/commands/project';
import { listFields } from '../src/commands/field';
import { listVersions, ensureVersion } from '../src/commands/version';

const mockedSearchIssues = vi.mocked(searchIssues);
const mockedGetIssue = vi.mocked(getIssue);
const mockedCreateIssue = vi.mocked(createIssue);
const mockedUpdateIssue = vi.mocked(updateIssue);
const mockedCommentIssue = vi.mocked(commentIssue);
const mockedTransitionIssue = vi.mocked(transitionIssue);
const mockedListProjects = vi.mocked(listProjects);
const mockedListFields = vi.mocked(listFields);
const mockedListVersions = vi.mocked(listVersions);
const mockedEnsureVersion = vi.mocked(ensureVersion);

async function runCli(args: string[]) {
  const originalArgv = process.argv;
  process.argv = ['node', 'jira-cli', ...args];

  vi.resetModules();

  // Re-mock after resetModules
  vi.doMock('../src/commands/issue', () => ({
    searchIssues: mockedSearchIssues,
    getIssue: mockedGetIssue,
    createIssue: mockedCreateIssue,
    updateIssue: mockedUpdateIssue,
    commentIssue: mockedCommentIssue,
    transitionIssue: mockedTransitionIssue,
  }));

  vi.doMock('../src/commands/project', () => ({
    listProjects: mockedListProjects,
  }));

  vi.doMock('../src/commands/field', () => ({
    listFields: mockedListFields,
  }));

  vi.doMock('../src/commands/version', () => ({
    listVersions: mockedListVersions,
    ensureVersion: mockedEnsureVersion,
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
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('jira-cli'));
      expect(exitSpy).toHaveBeenCalledWith(0);
    });

    it('prints help with --help flag', async () => {
      await runCli(['--help']);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('jira-cli'));
      expect(exitSpy).toHaveBeenCalledWith(0);
    });

    it('prints help with -h flag', async () => {
      await runCli(['-h']);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('jira-cli'));
      expect(exitSpy).toHaveBeenCalledWith(0);
    });
  });

  describe('unknown commands', () => {
    it('exits 1 for unknown resource', async () => {
      await runCli(['unknown']);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown resource'));
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('exits 1 for unknown issue action', async () => {
      await runCli(['issue', 'unknown']);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown action'));
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('exits 1 for unknown project action', async () => {
      await runCli(['project', 'unknown']);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown action'));
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('exits 1 for unknown field action', async () => {
      await runCli(['field', 'unknown']);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown action'));
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('exits 1 for unknown version action', async () => {
      await runCli(['version', 'unknown']);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown action'));
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('issue commands', () => {
    it('dispatches issue search with JQL', async () => {
      mockedSearchIssues.mockResolvedValue();
      await runCli(['issue', 'search', '--jql', 'project = PROJ', '--fields', 'summary', '--limit', '10', '--start-at', '5']);
      expect(mockedSearchIssues).toHaveBeenCalledWith({
        jql: 'project = PROJ',
        fields: 'summary',
        limit: '10',
        startAt: '5',
      });
    });

    it('dispatches issue get with key and options', async () => {
      mockedGetIssue.mockResolvedValue();
      await runCli(['issue', 'get', 'PROJ-123', '--fields', 'summary,status', '--expand', 'transitions']);
      expect(mockedGetIssue).toHaveBeenCalledWith('PROJ-123', {
        fields: 'summary,status',
        expand: 'transitions',
      });
    });

    it('dispatches issue create with all options', async () => {
      mockedCreateIssue.mockResolvedValue();
      await runCli([
        'issue', 'create',
        '--project', 'PROJ',
        '--type', 'Bug',
        '--summary', 'Login fails',
        '--description', 'Steps to reproduce',
        '--priority', 'High',
        '--assignee', 'abc-123',
        '--label', 'bug',
        '--component', 'Auth',
      ]);
      expect(mockedCreateIssue).toHaveBeenCalledWith({
        project: 'PROJ',
        type: 'Bug',
        summary: 'Login fails',
        description: 'Steps to reproduce',
        priority: 'High',
        assignee: 'abc-123',
        labels: ['bug'],
        components: ['Auth'],
      });
    });

    it('dispatches issue update with key and options', async () => {
      mockedUpdateIssue.mockResolvedValue();
      await runCli(['issue', 'update', 'PROJ-123', '--summary', 'New title', '--assignee', 'abc-123']);
      expect(mockedUpdateIssue).toHaveBeenCalledWith('PROJ-123', {
        summary: 'New title',
        assignee: 'abc-123',
      });
    });

    it('dispatches issue comment with body and visibility', async () => {
      mockedCommentIssue.mockResolvedValue();
      await runCli([
        'issue', 'comment', 'PROJ-123',
        '--body', 'Test comment',
        '--visibility-type', 'role',
        '--visibility-value', 'Developers',
      ]);
      expect(mockedCommentIssue).toHaveBeenCalledWith('PROJ-123', 'Test comment', {
        visibilityType: 'role',
        visibilityValue: 'Developers',
      });
    });

    it('dispatches issue transition', async () => {
      mockedTransitionIssue.mockResolvedValue();
      await runCli(['issue', 'transition', 'PROJ-123', '--to', 'Done']);
      expect(mockedTransitionIssue).toHaveBeenCalledWith('PROJ-123', 'Done');
    });
  });

  describe('project commands', () => {
    it('dispatches project list', async () => {
      mockedListProjects.mockResolvedValue();
      await runCli(['project', 'list']);
      expect(mockedListProjects).toHaveBeenCalled();
    });
  });

  describe('field commands', () => {
    it('dispatches field list', async () => {
      mockedListFields.mockResolvedValue();
      await runCli(['field', 'list']);
      expect(mockedListFields).toHaveBeenCalled();
    });
  });

  describe('version commands', () => {
    it('dispatches version list', async () => {
      mockedListVersions.mockResolvedValue();
      await runCli(['version', 'list', '--project', 'PROJ']);
      expect(mockedListVersions).toHaveBeenCalledWith({ project: 'PROJ' });
    });

    it('dispatches version ensure', async () => {
      mockedEnsureVersion.mockResolvedValue();
      await runCli(['version', 'ensure', '--project', 'PROJ', '--name', '1.0.0', '--description', 'Release']);
      expect(mockedEnsureVersion).toHaveBeenCalledWith({
        project: 'PROJ',
        name: '1.0.0',
        description: 'Release',
      });
    });
  });

  describe('error handling', () => {
    it('outputs JSON error to stderr and exits 1 when command throws', async () => {
      mockedSearchIssues.mockRejectedValue(new Error('JIRA_CLOUD_TOKEN is required'));
      await runCli(['issue', 'search', '--jql', 'test']);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        JSON.stringify({ error: 'JIRA_CLOUD_TOKEN is required' })
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});
