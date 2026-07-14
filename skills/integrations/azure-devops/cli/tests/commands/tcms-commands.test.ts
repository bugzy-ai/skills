import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { testPlanCommand } from '../../src/commands/test-plans';
import { testSuiteCommand } from '../../src/commands/test-suites';
import { testCaseCommand } from '../../src/commands/test-cases';
import { testPointCommand } from '../../src/commands/test-points';
import { testRunCommand } from '../../src/commands/test-runs';
import { testResultCommand } from '../../src/commands/test-results';

function response(body: unknown, status = 200, continuationToken?: string) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (key: string) => key === 'x-ms-continuationtoken' ? continuationToken ?? null : null },
    json: () => Promise.resolve(body),
  };
}

function requestBody(call = 0): unknown {
  const options = (fetch as ReturnType<typeof vi.fn>).mock.calls[call][1] as { body?: string };
  return options.body ? JSON.parse(options.body) : undefined;
}

describe('Azure Test Plans commands', () => {
  beforeEach(() => {
    process.env.AZURE_DEVOPS_ORG_URL = 'https://dev.azure.com/example';
    process.env.AZURE_DEVOPS_PAT = 'secret-pat';
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists plans and preserves the continuation token', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ count: 1, value: [{ id: 5, name: 'Release' }] }, 200, 'next')));

    await testPlanCommand('list', undefined, { project: 'Demo', activeOnly: 'true' });

    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain('/Demo/_apis/testplan/plans?filterActivePlans=true&api-version=7.1');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('"continuationToken": "next"'));
  });

  it('creates a plan with project-root defaults', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ id: 5, name: 'Release' })));

    await testPlanCommand('create', undefined, { project: 'Demo', name: 'Release' });

    expect(requestBody()).toEqual({ name: 'Release', areaPath: 'Demo', iteration: 'Demo', owner: null });
  });

  it('creates a static child suite and manages case membership', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(response({ id: 12, name: 'Login' }))
      .mockResolvedValueOnce(response({ count: 2, value: [{ workItem: { id: 20 } }, { workItem: { id: 21 } }] }))
      .mockResolvedValueOnce(response({}, 204)));

    await testSuiteCommand('create', undefined, {
      project: 'Demo', planId: '5', parentSuiteId: '6', name: 'Login', configurationIds: '1,2',
    });
    await testSuiteCommand('add-cases', '12', {
      project: 'Demo', planId: '5', caseIds: '20,21', configurationIds: '1,2',
    });
    await testSuiteCommand('remove-cases', '12', { project: 'Demo', planId: '5', caseIds: '21' });

    expect(requestBody(0)).toEqual({
      name: 'Login',
      suiteType: 'staticTestSuite',
      parentSuite: { id: 6 },
      inheritDefaultConfigurations: false,
      defaultConfigurations: [{ id: 1 }, { id: 2 }],
    });
    expect(requestBody(1)).toEqual([
      { workItem: { id: 20 }, pointAssignments: [{ configurationId: 1 }, { configurationId: 2 }] },
      { workItem: { id: 21 }, pointAssignments: [{ configurationId: 1 }, { configurationId: 2 }] },
    ]);
    const removeUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[2][0] as string;
    expect(removeUrl).toContain('/TestCase?testCaseIds=21&api-version=7.1');
  });

  it('uses suite default configurations when adding cases without explicit assignments', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response([{ workItem: { id: 20 } }])));

    await testSuiteCommand('add-cases', '12', { project: 'Demo', planId: '5', caseIds: '20' });

    expect(requestBody()).toEqual([{ workItem: { id: 20 } }]);
  });

  it('creates a Test Case work item with serialized steps', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ id: 20, fields: { 'System.Title': 'Login' } })));

    await testCaseCommand('create', undefined, {
      project: 'Demo',
      title: 'Login',
      steps: '[{"action":"Open <login>","expected":"Form is visible"}]',
      priority: '1',
    });

    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    const body = requestBody() as Array<{ path: string; value: unknown }>;
    expect(url).toContain('/_apis/wit/workitems/$Test%20Case');
    expect(body.find((operation) => operation.path === '/fields/Microsoft.VSTS.TCM.Steps')?.value).toContain('&lt;login&gt;');
  });

  it('rejects invalid Test Case steps before making a request', async () => {
    vi.stubGlobal('fetch', vi.fn());

    await expect(testCaseCommand('create', undefined, {
      project: 'Demo', title: 'Login', steps: '[{"action":"Open"}]',
    })).rejects.toThrow('requires an expected string');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('lists test points from the stable testplan endpoint', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ count: 1, value: [{ id: 17 }] }, 200, 'point-next')));

    await testPointCommand('list', { project: 'Demo', planId: '5', suiteId: '12', caseId: '20' });

    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain('/_apis/testplan/Plans/5/Suites/12/TestPoint?testCaseId=20&api-version=7.1');
  });

  it('creates and completes a run with explicit point and run IDs', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(response({ id: 33, state: 'InProgress' }))
      .mockResolvedValueOnce(response({ id: 33, state: 'Completed' })));

    await testRunCommand('create', undefined, { project: 'Demo', planId: '5', pointIds: '17,18', name: 'Smoke' });
    await testRunCommand('complete', '33', { project: 'Demo', completedDate: '2026-07-13T12:00:00Z' });

    expect(requestBody(0)).toEqual({ name: 'Smoke', plan: { id: '5' }, pointIds: [17, 18], automated: false });
    expect(requestBody(1)).toEqual({ state: 'Completed', completedDate: '2026-07-13T12:00:00Z' });
  });

  it('adds and updates results with Azure identities', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(response({ count: 1, value: [{ id: 100001, url: 'https://result' }] }))
      .mockResolvedValueOnce(response({ count: 1, value: [{ id: 100001, outcome: 'Failed' }] })));

    await testResultCommand('add', undefined, {
      project: 'Demo', runId: '33', results: '[{"testPointId":17,"outcome":"Passed","durationMs":1200}]',
    });
    await testResultCommand('update', '100001', {
      project: 'Demo', runId: '33', outcome: 'Failed', comment: 'Regression',
    });

    expect(requestBody(0)).toEqual([{
      testPoint: { id: '17' }, outcome: 'Passed', state: 'Completed', durationInMs: 1200,
    }]);
    expect(requestBody(1)).toEqual([{
      id: 100001, outcome: 'Failed', state: 'Completed', comment: 'Regression',
    }]);
  });

  it('rejects malformed result JSON before making a request', async () => {
    vi.stubGlobal('fetch', vi.fn());

    await expect(testResultCommand('add', undefined, {
      project: 'Demo', runId: '33', results: '{bad',
    })).rejects.toThrow('--results must be valid JSON');
    expect(fetch).not.toHaveBeenCalled();
  });
});
