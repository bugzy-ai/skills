import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ensurePlan } from '../../src/commands/ensure-plan';
import { mockOk } from '../mock-response';

describe('ensure-plan', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, ZEPHYR_API_TOKEN: 'test-token' };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('throws if --project is missing', async () => {
    await expect(ensurePlan({ project: '', release: '1.0.0' })).rejects.toThrow('--project is required');
  });

  it('reuses an existing release test plan', async () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const existing = { id: 1, key: 'PROJ-P1', name: '1.0.0 Release Test Plan', project: { id: 1, key: 'PROJ' } };
    const mockFetch = vi.fn().mockResolvedValue(
      mockOk({ values: [existing], total: 1, startAt: 0, maxResults: 100, isLast: true })
    );
    vi.stubGlobal('fetch', mockFetch);

    await ensurePlan({ project: 'PROJ', release: '1.0.0' });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(writeSpy.mock.calls[0][0] as string)).toEqual({ created: false, plan: existing });
  });

  it('creates a missing release test plan with deterministic name and label', async () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(mockOk({ values: [], total: 0, startAt: 0, maxResults: 100, isLast: true }))
      .mockResolvedValueOnce(mockOk({ id: 2, key: 'PROJ-P2', self: 'https://example.test' }));
    vi.stubGlobal('fetch', mockFetch);

    await ensurePlan({ project: 'PROJ', release: '1.0.0', status: 'Draft' });

    expect(mockFetch.mock.calls[1][0]).toContain('/testplans');
    const body = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(body).toEqual({
      projectKey: 'PROJ',
      name: '1.0.0 Release Test Plan',
      labels: ['release:1.0.0'],
      statusName: 'Draft',
    });
    expect(JSON.parse(writeSpy.mock.calls[0][0] as string).created).toBe(true);
  });

  it('uses an explicit plan name when provided', async () => {
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(mockOk({ values: [], total: 0, startAt: 0, maxResults: 100, isLast: true }))
      .mockResolvedValueOnce(mockOk({ id: 2, key: 'PROJ-P2' }));
    vi.stubGlobal('fetch', mockFetch);

    await ensurePlan({ project: 'PROJ', name: 'Regression Plan' });

    const body = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(body.name).toBe('Regression Plan');
    expect(body.labels).toBeUndefined();
  });

  it('rejects a non-numeric folder ID', async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    await expect(ensurePlan({ project: 'PROJ', release: '1.0.0', folder: 'abc' })).rejects.toThrow(
      '--folder must be a positive numeric ID'
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
