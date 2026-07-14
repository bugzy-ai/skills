import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getConfig,
  request,
  requestWithMeta,
  listProjects,
  searchWorkItems,
  getWorkItem,
  getWorkItemsBatch,
  createWorkItem,
  updateWorkItem,
  addComment,
  buildJsonPatch,
  getBaseUrl,
  AzureDevOpsError,
} from '../src/api-client';

describe('getConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns config when both env vars are set', () => {
    process.env.AZURE_DEVOPS_ORG_URL = 'https://dev.azure.com/my-org';
    process.env.AZURE_DEVOPS_PAT = 'my-pat';
    const config = getConfig();
    expect(config.orgUrl).toBe('https://dev.azure.com/my-org');
    expect(config.pat).toBe('my-pat');
  });

  it('strips trailing slash from org URL', () => {
    process.env.AZURE_DEVOPS_ORG_URL = 'https://dev.azure.com/my-org/';
    process.env.AZURE_DEVOPS_PAT = 'my-pat';
    const config = getConfig();
    expect(config.orgUrl).toBe('https://dev.azure.com/my-org');
  });

  it('adds https to an organization URL without a scheme', () => {
    process.env.AZURE_DEVOPS_ORG_URL = 'dev.azure.com/my-org';
    process.env.AZURE_DEVOPS_PAT = 'my-pat';
    expect(getConfig().orgUrl).toBe('https://dev.azure.com/my-org');
  });

  it('rejects non-Azure and non-HTTPS organization URLs', () => {
    process.env.AZURE_DEVOPS_PAT = 'my-pat';
    process.env.AZURE_DEVOPS_ORG_URL = 'http://dev.azure.com/my-org';
    expect(() => getConfig()).toThrow('must use HTTPS');

    process.env.AZURE_DEVOPS_ORG_URL = 'https://example.com/my-org';
    expect(() => getConfig()).toThrow('must use HTTPS');
  });

  it('throws when AZURE_DEVOPS_ORG_URL is missing', () => {
    delete process.env.AZURE_DEVOPS_ORG_URL;
    process.env.AZURE_DEVOPS_PAT = 'my-pat';
    expect(() => getConfig()).toThrow('AZURE_DEVOPS_ORG_URL');
  });

  it('throws when AZURE_DEVOPS_PAT is missing', () => {
    process.env.AZURE_DEVOPS_ORG_URL = 'https://dev.azure.com/my-org';
    delete process.env.AZURE_DEVOPS_PAT;
    expect(() => getConfig()).toThrow('AZURE_DEVOPS_PAT');
  });
});

describe('request', () => {
  const config = {
    orgUrl: 'https://dev.azure.com/my-org',
    pat: 'test-pat',
    timeout: 5000,
  };

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('sends correct Basic auth header', async () => {
    const expectedAuth = `Basic ${Buffer.from(':test-pat').toString('base64')}`;

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ value: [] }),
      })
    );

    await request('GET', 'projects', { config });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/_apis/projects'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: expectedAuth,
        }),
      })
    );
  });

  it('uses project prefix when project is specified', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: 1 }),
      })
    );

    await request('GET', 'wit/workitems/1', { project: 'MyProject', config });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/MyProject/_apis/wit/workitems/1'),
      expect.anything()
    );
  });

  it('uses JSON Patch content type when specified', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: 1 }),
      })
    );

    const ops = [{ op: 'add', path: '/fields/System.Title', value: 'Test' }];
    await request('POST', 'wit/workitems/$Bug', {
      body: ops,
      contentType: 'application/json-patch+json',
      project: 'MyProject',
      config,
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json-patch+json',
        }),
      })
    );
  });

  it('includes api-version query parameter', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ value: [] }),
      })
    );

    await request('GET', 'projects', { config });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('api-version=7.1'),
      expect.anything()
    );
  });

  it('uses custom api version when specified', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: 1 }),
      })
    );

    await request('POST', 'wit/workitems/1/comments', {
      body: { text: 'Hi' },
      apiVersion: '7.1-preview.4',
      project: 'MyProject',
      config,
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('api-version=7.1-preview.4'),
      expect.anything()
    );
  });

  it('retries on 429 with Retry-After header', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: { get: (key: string) => (key === 'Retry-After' ? '1' : null) },
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ value: 'ok' }),
        })
    );

    const result = await request<{ value: string }>('GET', 'projects', { config });
    expect(result.value).toBe('ok');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('retries on 5xx errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          headers: { get: () => null },
          json: () => Promise.resolve({ message: 'Service unavailable' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ value: 'recovered' }),
        })
    );

    const result = await request<{ value: string }>('GET', 'projects', { config });
    expect(result.value).toBe('recovered');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('throws AzureDevOpsError on 401', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: { get: () => null },
        json: () => Promise.resolve({}),
      })
    );

    await expect(request('GET', 'projects', { config })).rejects.toThrow(
      'Authentication failed (401)'
    );
  });

  it('returns continuation metadata from Azure list responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: (key: string) => key === 'x-ms-continuationtoken' ? 'next-page' : null },
      json: () => Promise.resolve({ count: 1, value: [{ id: 1 }] }),
    }));

    const response = await requestWithMeta<{ count: number }>('GET', 'testplan/plans', { project: 'Demo', config });

    expect(response.continuationToken).toBe('next-page');
  });

  it('explains missing Test Management permission on TCMS 403 responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      headers: { get: () => null },
      json: () => Promise.resolve({ message: 'Forbidden' }),
    }));

    await expect(request('GET', 'testplan/plans', { project: 'Demo', config })).rejects.toThrow(
      'Test Management read/write permissions',
    );
  });

  it('redacts the PAT from Azure error messages', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      headers: { get: () => null },
      json: () => Promise.resolve({ message: 'Request included test-pat' }),
    }));

    await expect(request('GET', 'projects', { config })).rejects.toThrow('Request included [redacted]');
  });

  it('throws on 400 without retry', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        headers: { get: () => null },
        json: () => Promise.resolve({ message: 'Bad request' }),
      })
    );

    await expect(request('GET', 'projects', { config })).rejects.toThrow('Bad request');
    expect(fetch).toHaveBeenCalledTimes(1); // No retries
  });

  it('parses Azure DevOps error body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        headers: { get: () => null },
        json: () =>
          Promise.resolve({
            message: 'Work item 99999 does not exist',
            typeKey: 'WorkItemNotFoundException',
          }),
      })
    );

    await expect(request('GET', 'wit/workitems/99999', { config })).rejects.toThrow(
      'Work item 99999 does not exist'
    );
  });
});

describe('buildJsonPatch', () => {
  it('maps friendly field names to reference names', () => {
    const ops = buildJsonPatch({
      title: 'My Bug',
      state: 'Active',
      priority: 1,
      severity: '1 - Critical',
    });

    expect(ops).toEqual([
      { op: 'add', path: '/fields/System.Title', value: 'My Bug' },
      { op: 'add', path: '/fields/System.State', value: 'Active' },
      { op: 'add', path: '/fields/Microsoft.VSTS.Common.Priority', value: 1 },
      { op: 'add', path: '/fields/Microsoft.VSTS.Common.Severity', value: '1 - Critical' },
    ]);
  });

  it('maps assignee and assigned-to to System.AssignedTo', () => {
    const ops1 = buildJsonPatch({ assignee: 'user@example.com' });
    expect(ops1[0].path).toBe('/fields/System.AssignedTo');

    const ops2 = buildJsonPatch({ 'assigned-to': 'user@example.com' });
    expect(ops2[0].path).toBe('/fields/System.AssignedTo');
  });

  it('skips undefined/null values', () => {
    const ops = buildJsonPatch({ title: 'Test', state: undefined, priority: null as unknown as undefined });
    expect(ops).toEqual([{ op: 'add', path: '/fields/System.Title', value: 'Test' }]);
  });

  it('passes through unknown field names', () => {
    const ops = buildJsonPatch({ 'Custom.Field': 'value' });
    expect(ops).toEqual([{ op: 'add', path: '/fields/Custom.Field', value: 'value' }]);
  });
});

describe('listProjects', () => {
  afterEach(() => vi.restoreAllMocks());

  it('calls projects endpoint without project prefix', async () => {
    const config = { orgUrl: 'https://dev.azure.com/my-org', pat: 'test-pat' };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            count: 1,
            value: [{ id: '1', name: 'MyProject', state: 'wellFormed', visibility: 'private' }],
          }),
      })
    );

    const projects = await listProjects({ config });
    expect(projects).toHaveLength(1);
    expect(projects[0].name).toBe('MyProject');

    // Should NOT have a project prefix in the URL
    const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toBe('https://dev.azure.com/my-org/_apis/projects?api-version=7.1');
  });

  it('includes pagination params', async () => {
    const config = { orgUrl: 'https://dev.azure.com/my-org', pat: 'test-pat' };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ count: 0, value: [] }),
      })
    );

    await listProjects({ top: 10, skip: 5, config });

    const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain('$top=10');
    expect(calledUrl).toContain('$skip=5');
  });
});

describe('getWorkItemsBatch', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns empty array for empty IDs', async () => {
    const result = await getWorkItemsBatch([], 'MyProject');
    expect(result).toEqual([]);
  });

  it('batches IDs in groups of 200', async () => {
    const config = { orgUrl: 'https://dev.azure.com/my-org', pat: 'test-pat' };
    const ids = Array.from({ length: 300 }, (_, i) => i + 1);

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ value: [{ id: 1 }] }),
      })
    );

    await getWorkItemsBatch(ids, 'MyProject', { config });

    // Should make 2 batches: 200 + 100
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe('addComment', () => {
  afterEach(() => vi.restoreAllMocks());

  it('uses preview API version 7.1-preview.4', async () => {
    const config = { orgUrl: 'https://dev.azure.com/my-org', pat: 'test-pat' };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({ id: 1, workItemId: 42, text: 'Hello', version: 1 }),
      })
    );

    await addComment(42, 'Hello', 'MyProject', { config });

    const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain('api-version=7.1-preview.4');
  });
});

describe('getBaseUrl', () => {
  it('returns org URL from provided config', () => {
    const url = getBaseUrl({ orgUrl: 'https://dev.azure.com/my-org', pat: 'test' });
    expect(url).toBe('https://dev.azure.com/my-org');
  });
});
