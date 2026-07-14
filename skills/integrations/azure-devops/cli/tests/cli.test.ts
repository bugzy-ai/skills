import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock all command modules
vi.mock('../src/commands/list-projects', () => ({
  listProjectsCommand: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../src/commands/search', () => ({
  searchCommand: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../src/commands/get', () => ({
  getCommand: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../src/commands/create', () => ({
  createCommand: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../src/commands/update', () => ({
  updateCommand: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../src/commands/comment', () => ({
  commentCommand: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../src/commands/test-plans', () => ({ testPlanCommand: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../src/commands/test-suites', () => ({ testSuiteCommand: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../src/commands/test-cases', () => ({ testCaseCommand: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../src/commands/test-points', () => ({ testPointCommand: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../src/commands/test-runs', () => ({ testRunCommand: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../src/commands/test-results', () => ({ testResultCommand: vi.fn().mockResolvedValue(undefined) }));

describe('CLI', () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    process.exitCode = undefined;
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.exitCode = undefined;
    vi.restoreAllMocks();
  });

  async function runCli(args: string[]) {
    process.argv = ['node', 'azure-devops-cli', ...args];
    vi.resetModules();

    // Re-mock after module reset
    vi.doMock('../src/commands/list-projects', () => ({
      listProjectsCommand: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../src/commands/search', () => ({
      searchCommand: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../src/commands/get', () => ({
      getCommand: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../src/commands/create', () => ({
      createCommand: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../src/commands/update', () => ({
      updateCommand: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../src/commands/comment', () => ({
      commentCommand: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../src/commands/test-plans', () => ({ testPlanCommand: vi.fn().mockResolvedValue(undefined) }));
    vi.doMock('../src/commands/test-suites', () => ({ testSuiteCommand: vi.fn().mockResolvedValue(undefined) }));
    vi.doMock('../src/commands/test-cases', () => ({ testCaseCommand: vi.fn().mockResolvedValue(undefined) }));
    vi.doMock('../src/commands/test-points', () => ({ testPointCommand: vi.fn().mockResolvedValue(undefined) }));
    vi.doMock('../src/commands/test-runs', () => ({ testRunCommand: vi.fn().mockResolvedValue(undefined) }));
    vi.doMock('../src/commands/test-results', () => ({ testResultCommand: vi.fn().mockResolvedValue(undefined) }));

    await import('../src/cli');
  }

  it('shows help with --help', async () => {
    await runCli(['--help']);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('azure-devops-cli'));
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('shows help with -h', async () => {
    await runCli(['-h']);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('azure-devops-cli'));
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('shows help with no args', async () => {
    await runCli([]);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('azure-devops-cli'));
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('shows version with --version', async () => {
    await runCli(['--version']);
    expect(consoleSpy).toHaveBeenCalledWith('0.2.0');
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('dispatches project list', async () => {
    await runCli(['project', 'list', '--top', '10']);
    const { listProjectsCommand } = await import('../src/commands/list-projects');
    expect(listProjectsCommand).toHaveBeenCalledWith(
      expect.objectContaining({ top: '10' })
    );
  });

  it('dispatches work-item search', async () => {
    await runCli(['work-item', 'search', '--project', 'MyProject', '--query', 'login bug']);
    const { searchCommand } = await import('../src/commands/search');
    expect(searchCommand).toHaveBeenCalledWith(
      expect.objectContaining({ project: 'MyProject', query: 'login bug' })
    );
  });

  it('dispatches work-item get with ID', async () => {
    await runCli(['work-item', 'get', '123', '--project', 'MyProject']);
    const { getCommand } = await import('../src/commands/get');
    expect(getCommand).toHaveBeenCalledWith('123', expect.objectContaining({ project: 'MyProject' }));
  });

  it('dispatches work-item create', async () => {
    await runCli([
      'work-item', 'create',
      '--project', 'MyProject',
      '--type', 'Bug',
      '--title', 'Login timeout',
    ]);
    const { createCommand } = await import('../src/commands/create');
    expect(createCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        project: 'MyProject',
        type: 'Bug',
        title: 'Login timeout',
      })
    );
  });

  it('dispatches work-item update', async () => {
    await runCli(['work-item', 'update', '42', '--project', 'MyProject', '--state', 'Resolved']);
    const { updateCommand } = await import('../src/commands/update');
    expect(updateCommand).toHaveBeenCalledWith(
      '42',
      expect.objectContaining({ project: 'MyProject', state: 'Resolved' })
    );
  });

  it('dispatches work-item comment', async () => {
    await runCli(['work-item', 'comment', '42', '--project', 'MyProject', '--body', 'QA verified']);
    const { commentCommand } = await import('../src/commands/comment');
    expect(commentCommand).toHaveBeenCalledWith(
      '42',
      expect.objectContaining({ project: 'MyProject', body: 'QA verified' })
    );
  });

  it('dispatches Test Plans resource commands', async () => {
    await runCli(['test-plan', 'list', '--project', 'Demo']);
    const { testPlanCommand } = await import('../src/commands/test-plans');
    expect(testPlanCommand).toHaveBeenCalledWith('list', undefined, expect.objectContaining({ project: 'Demo' }));

    await runCli(['test-suite', 'add-cases', '12', '--project', 'Demo', '--plan-id', '5', '--case-ids', '20,21']);
    const { testSuiteCommand } = await import('../src/commands/test-suites');
    expect(testSuiteCommand).toHaveBeenCalledWith('add-cases', '12', expect.objectContaining({ planId: '5', caseIds: '20,21' }));

    await runCli(['test-case', 'create', '--project', 'Demo', '--title', 'Login', '--steps', '[]']);
    const { testCaseCommand } = await import('../src/commands/test-cases');
    expect(testCaseCommand).toHaveBeenCalledWith('create', undefined, expect.objectContaining({ title: 'Login', steps: '[]' }));

    await runCli(['test-point', 'list', '--project', 'Demo', '--plan-id', '5', '--suite-id', '12']);
    const { testPointCommand } = await import('../src/commands/test-points');
    expect(testPointCommand).toHaveBeenCalledWith('list', expect.objectContaining({ planId: '5', suiteId: '12' }));

    await runCli(['test-run', 'complete', '33', '--project', 'Demo']);
    const { testRunCommand } = await import('../src/commands/test-runs');
    expect(testRunCommand).toHaveBeenCalledWith('complete', '33', expect.objectContaining({ project: 'Demo' }));

    await runCli(['test-result', 'update', '100', '--project', 'Demo', '--run-id', '33', '--outcome', 'Passed']);
    const { testResultCommand } = await import('../src/commands/test-results');
    expect(testResultCommand).toHaveBeenCalledWith('update', '100', expect.objectContaining({ runId: '33', outcome: 'Passed' }));
  });

  it('shows error for unknown resource', async () => {
    await runCli(['unknown-resource', 'do-something']);
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown resource'));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('shows error for unknown work-item action', async () => {
    await runCli(['work-item', 'unknown-action']);
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown action'));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
