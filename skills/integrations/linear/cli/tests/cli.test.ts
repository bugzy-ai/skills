import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock all command modules before importing CLI
vi.mock('../src/commands/issue', () => ({
  searchIssues: vi.fn(),
  getIssue: vi.fn(),
  createIssue: vi.fn(),
  updateIssue: vi.fn(),
  documentUpsertIssue: vi.fn(),
  commentIssue: vi.fn(),
  relateIssue: vi.fn(),
}));

vi.mock('../src/commands/team', () => ({
  listTeams: vi.fn(),
}));

vi.mock('../src/commands/project', () => ({
  listProjects: vi.fn(),
  getProject: vi.fn(),
}));

vi.mock('../src/commands/state', () => ({
  listStates: vi.fn(),
}));

vi.mock('../src/commands/label', () => ({
  listLabels: vi.fn(),
}));

import {
  searchIssues,
  getIssue,
  createIssue,
  updateIssue,
  documentUpsertIssue,
  commentIssue,
  relateIssue,
} from '../src/commands/issue';
import { listTeams } from '../src/commands/team';
import { getProject, listProjects } from '../src/commands/project';
import { listStates } from '../src/commands/state';
import { listLabels } from '../src/commands/label';

const mockedSearchIssues = vi.mocked(searchIssues);
const mockedGetIssue = vi.mocked(getIssue);
const mockedCreateIssue = vi.mocked(createIssue);
const mockedUpdateIssue = vi.mocked(updateIssue);
const mockedDocumentUpsertIssue = vi.mocked(documentUpsertIssue);
const mockedCommentIssue = vi.mocked(commentIssue);
const mockedRelateIssue = vi.mocked(relateIssue);
const mockedListTeams = vi.mocked(listTeams);
const mockedListProjects = vi.mocked(listProjects);
const mockedGetProject = vi.mocked(getProject);
const mockedListStates = vi.mocked(listStates);
const mockedListLabels = vi.mocked(listLabels);

function expectFormatter() {
  return expect.objectContaining({
    issueList: expect.any(Function),
    error: expect.any(Function),
  });
}

async function runCli(args: string[]) {
  const originalArgv = process.argv;
  process.argv = ['node', 'linear-cli', ...args];

  vi.resetModules();

  vi.doMock('../src/commands/issue', () => ({
    searchIssues: mockedSearchIssues,
    getIssue: mockedGetIssue,
    createIssue: mockedCreateIssue,
    updateIssue: mockedUpdateIssue,
    documentUpsertIssue: mockedDocumentUpsertIssue,
    commentIssue: mockedCommentIssue,
    relateIssue: mockedRelateIssue,
  }));

  vi.doMock('../src/commands/team', () => ({
    listTeams: mockedListTeams,
  }));

  vi.doMock('../src/commands/project', () => ({
    listProjects: mockedListProjects,
    getProject: mockedGetProject,
  }));

  vi.doMock('../src/commands/state', () => ({
    listStates: mockedListStates,
  }));

  vi.doMock('../src/commands/label', () => ({
    listLabels: mockedListLabels,
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
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('--json'));
      expect(exitSpy).toHaveBeenCalledWith(0);
    });

    it('prints help with --help flag', async () => {
      await runCli(['--help']);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('linear-cli'));
      expect(exitSpy).toHaveBeenCalledWith(0);
    });

    it('lists document-upsert in help output', async () => {
      await runCli(['--help']);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('issue document-upsert'));
      expect(exitSpy).toHaveBeenCalledWith(0);
    });

    it('lists accepted credential environment variables', async () => {
      await runCli(['--help']);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('LINEAR_API_KEY'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('LINEAR_ACCESS_TOKEN'));
      expect(exitSpy).toHaveBeenCalledWith(0);
    });

    it('prints help with -h flag', async () => {
      await runCli(['-h']);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('linear-cli'));
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
      await runCli(['issue', 'unknown']);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown action'));
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('issue commands', () => {
    it('dispatches issue search with all options including single label', async () => {
      mockedSearchIssues.mockResolvedValue();
      await runCli([
        'issue', 'search',
        '--query', 'login bug',
        '--team', 'ENG',
        '--state', 'In Progress',
        '--label', 'Bug',
        '--limit', '10',
      ]);
      expect(mockedSearchIssues).toHaveBeenCalledWith({
        query: 'login bug',
        team: 'ENG',
        state: 'In Progress',
        labels: ['Bug'],
        limit: '10',
      }, expectFormatter());
    });

    it('dispatches issue search with repeated --label flags', async () => {
      mockedSearchIssues.mockResolvedValue();
      await runCli([
        'issue', 'search',
        '--query', 'test',
        '--label', 'frontend',
        '--label', 'regression',
      ]);
      expect(mockedSearchIssues).toHaveBeenCalledWith({
        query: 'test',
        team: undefined,
        state: undefined,
        labels: ['frontend', 'regression'],
        limit: undefined,
      }, expectFormatter());
    });

    it('prints JSON through formatter when --json is used', async () => {
      const issues = [{ id: '1', identifier: 'ENG-1' }];
      mockedSearchIssues.mockImplementationOnce(async (_options, output) => {
        output!.issueList(issues);
      });

      await runCli(['issue', 'search', '--query', 'test', '--json']);

      expect(mockedSearchIssues).toHaveBeenCalledWith({
        query: 'test',
        team: undefined,
        state: undefined,
        labels: [],
        limit: undefined,
      }, expectFormatter());
      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(issues));
    });

    it('dispatches issue get with identifier', async () => {
      mockedGetIssue.mockResolvedValue();
      await runCli(['issue', 'get', 'ENG-123']);
      expect(mockedGetIssue).toHaveBeenCalledWith('ENG-123', expectFormatter());
    });

    it('dispatches issue create with full generic options', async () => {
      mockedCreateIssue.mockResolvedValue();
      await runCli([
        'issue', 'create',
        '--team', 'ENG',
        '--title', 'Bug: Login fails',
        '--description', 'Steps to reproduce...',
        '--priority', '2',
        '--label', 'bug',
        '--label', 'qa',
        '--state', 'Backlog',
        '--project', 'Sprint 1',
      ]);
      expect(mockedCreateIssue).toHaveBeenCalledWith({
        team: 'ENG',
        title: 'Bug: Login fails',
        description: 'Steps to reproduce...',
        descriptionFile: undefined,
        priority: '2',
        labels: ['bug', 'qa'],
        state: 'Backlog',
        project: 'Sprint 1',
      }, expectFormatter());
    });

    it('dispatches issue create with --description-file', async () => {
      mockedCreateIssue.mockResolvedValue();
      await runCli([
        'issue', 'create',
        '--team', 'ENG',
        '--title', 'big description',
        '--description-file', '/tmp/desc.md',
      ]);
      const call = mockedCreateIssue.mock.calls[0][0];
      expect(call.descriptionFile).toBe('/tmp/desc.md');
      expect(call.description).toBeUndefined();
    });

    it('dispatches issue update with identifier and full option set', async () => {
      mockedUpdateIssue.mockResolvedValue();
      await runCli([
        'issue', 'update', 'ENG-123',
        '--state', 'Done',
        '--priority', '1',
        '--label', 'bug',
        '--label', 'fixed',
      ]);
      expect(mockedUpdateIssue).toHaveBeenCalledWith('ENG-123', {
        state: 'Done',
        priority: '1',
        assignee: undefined,
        title: undefined,
        description: undefined,
        descriptionFile: undefined,
        labels: ['bug', 'fixed'],
        project: undefined,
      }, expectFormatter());
    });

    it('dispatches issue comment with --body', async () => {
      mockedCommentIssue.mockResolvedValue();
      await runCli([
        'issue', 'comment', 'ENG-123',
        '--body', 'Test evidence: all pass',
      ]);
      expect(mockedCommentIssue).toHaveBeenCalledWith(
        'ENG-123',
        { body: 'Test evidence: all pass', bodyFile: undefined },
        expectFormatter(),
      );
    });

    it('dispatches issue comment with --body-file', async () => {
      mockedCommentIssue.mockResolvedValue();
      await runCli([
        'issue', 'comment', 'ENG-123',
        '--body-file', '/tmp/comment.md',
      ]);
      expect(mockedCommentIssue).toHaveBeenCalledWith(
        'ENG-123',
        { body: undefined, bodyFile: '/tmp/comment.md' },
        expectFormatter(),
      );
    });

    it('dispatches issue document-upsert with title and content file', async () => {
      mockedDocumentUpsertIssue.mockResolvedValue();
      await runCli([
        'issue', 'document-upsert', 'BUG-1',
        '--title', 'BUG-1 — Implementation Plan',
        '--content-file', '/tmp/visual.md',
      ]);
      expect(mockedDocumentUpsertIssue).toHaveBeenCalledWith(
        'BUG-1',
        { title: 'BUG-1 — Implementation Plan', contentFile: '/tmp/visual.md' },
        expectFormatter(),
      );
    });

    it('dispatches issue relate with --blocks', async () => {
      mockedRelateIssue.mockResolvedValue();
      await runCli([
        'issue', 'relate', 'ENG-1',
        '--blocks', 'ENG-2',
      ]);
      expect(mockedRelateIssue).toHaveBeenCalledWith(
        'ENG-1',
        { blocks: 'ENG-2', related: undefined },
        expectFormatter(),
      );
    });

    it('dispatches issue relate with --related', async () => {
      mockedRelateIssue.mockResolvedValue();
      await runCli([
        'issue', 'relate', 'ENG-1',
        '--related', 'ENG-2',
      ]);
      expect(mockedRelateIssue).toHaveBeenCalledWith(
        'ENG-1',
        { blocks: undefined, related: 'ENG-2' },
        expectFormatter(),
      );
    });
  });

  describe('team commands', () => {
    it('dispatches team list', async () => {
      mockedListTeams.mockResolvedValue();
      await runCli(['team', 'list']);
      expect(mockedListTeams).toHaveBeenCalledWith(expectFormatter());
    });
  });

  describe('project commands', () => {
    it('dispatches project list with team filter', async () => {
      mockedListProjects.mockResolvedValue();
      await runCli(['project', 'list', '--team', 'ENG']);
      expect(mockedListProjects).toHaveBeenCalledWith('ENG', expectFormatter());
    });

    it('dispatches project list without filter', async () => {
      mockedListProjects.mockResolvedValue();
      await runCli(['project', 'list']);
      expect(mockedListProjects).toHaveBeenCalledWith(undefined, expectFormatter());
    });

    it('dispatches project get with name or ID', async () => {
      mockedGetProject.mockResolvedValue();
      await runCli(['project', 'get', 'unified-agent']);
      expect(mockedGetProject).toHaveBeenCalledWith('unified-agent', expectFormatter());
    });
  });

  describe('state commands', () => {
    it('dispatches state list with team', async () => {
      mockedListStates.mockResolvedValue();
      await runCli(['state', 'list', '--team', 'ENG']);
      expect(mockedListStates).toHaveBeenCalledWith('ENG', expectFormatter());
    });
  });

  describe('label commands', () => {
    it('dispatches label list with team filter', async () => {
      mockedListLabels.mockResolvedValue();
      await runCli(['label', 'list', '--team', 'ENG']);
      expect(mockedListLabels).toHaveBeenCalledWith('ENG', expectFormatter());
    });

    it('dispatches label list without filter', async () => {
      mockedListLabels.mockResolvedValue();
      await runCli(['label', 'list']);
      expect(mockedListLabels).toHaveBeenCalledWith(undefined, expectFormatter());
    });
  });

  describe('error handling', () => {
    it('outputs compact error to stderr and exits 1 when command throws', async () => {
      mockedSearchIssues.mockRejectedValue(new Error('LINEAR_API_KEY is required'));
      await runCli(['issue', 'search', '--query', 'test']);
      expect(consoleErrorSpy).toHaveBeenCalledWith('error: LINEAR_API_KEY is required');
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('outputs JSON error to stderr with --json', async () => {
      mockedSearchIssues.mockRejectedValue(new Error('LINEAR_API_KEY is required'));
      await runCli(['issue', 'search', '--query', 'test', '--json']);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        JSON.stringify({ error: 'LINEAR_API_KEY is required' })
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});
