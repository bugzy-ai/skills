import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { listCases } from '../../src/commands/list-cases';
import { mockOk } from '../mock-response';

describe('list-cases', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, ZEPHYR_API_TOKEN: 'test-token' };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('throws if --project is missing', async () => {
    await expect(listCases({ project: '' })).rejects.toThrow('--project is required');
  });

  it('lists test cases with auto-pagination by default', async () => {
    const response = { values: [], total: 0, startAt: 0, maxResults: 100, isLast: true };
    const mockFetch = vi.fn().mockResolvedValue(mockOk(response));
    vi.stubGlobal('fetch', mockFetch);
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await listCases({ project: 'PROJ' });

    expect(writeSpy).toHaveBeenCalledWith(
      JSON.stringify({ values: [], total: 0 }, null, 2)
    );
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('projectKey=PROJ');
    expect(url).toContain('maxResults=100');
  });

  it('uses explicit pagination when provided (backward compatibility)', async () => {
    const response = { values: [], total: 0, startAt: 10, maxResults: 5, isLast: true };
    const mockFetch = vi.fn().mockResolvedValue(mockOk(response));
    vi.stubGlobal('fetch', mockFetch);
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await listCases({ project: 'PROJ', folder: '123', maxResults: '5', startAt: '10' });

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('folderId=123');
    expect(url).toContain('maxResults=5');
    expect(url).toContain('startAt=10');
  });

  it('paginates through all cases for idempotency', async () => {
    const page1Cases = [{ id: 1, key: 'PROJ-T1', name: 'Case 1' }];
    const page2Cases = [{ id: 2, key: 'PROJ-T2', name: 'Case 2' }];
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(mockOk({ values: page1Cases, total: 2, startAt: 0, maxResults: 100, isLast: false }))
      .mockResolvedValueOnce(mockOk({ values: page2Cases, total: 2, startAt: 100, maxResults: 100, isLast: true }));
    vi.stubGlobal('fetch', mockFetch);
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await listCases({ project: 'PROJ' });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(writeSpy).toHaveBeenCalledWith(
      JSON.stringify({ values: [...page1Cases, ...page2Cases], total: 2 }, null, 2)
    );
  });

  it('uses API total, not array length', async () => {
    // API may report total higher than values returned (e.g. filtered results)
    const mockFetch = vi.fn().mockResolvedValueOnce(
      mockOk({ values: [{ id: 1, key: 'PROJ-T1', name: 'Case 1' }], total: 50, startAt: 0, maxResults: 100, isLast: true })
    );
    vi.stubGlobal('fetch', mockFetch);
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await listCases({ project: 'PROJ' });

    const output = JSON.parse(writeSpy.mock.calls[0][0] as string);
    expect(output.total).toBe(50); // API total, not 1
  });
});
