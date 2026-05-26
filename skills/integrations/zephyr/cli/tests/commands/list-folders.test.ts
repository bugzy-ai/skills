import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { listFolders } from '../../src/commands/list-folders';
import { mockOk } from '../mock-response';

describe('list-folders', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, ZEPHYR_API_TOKEN: 'test-token' };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('throws if --project is missing', async () => {
    await expect(listFolders({ project: '' })).rejects.toThrow('--project is required');
  });

  it('lists folders and outputs JSON', async () => {
    const response = {
      values: [{ id: 1, name: 'Bugzy Tests', folderType: 'TEST_CASE' }],
      total: 1, startAt: 0, maxResults: 100, isLast: true,
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockOk(response)));
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await listFolders({ project: 'PROJ' });

    expect(writeSpy).toHaveBeenCalledWith(
      JSON.stringify({ values: response.values, total: response.values.length }, null, 2)
    );
  });

  it('paginates through all folders', async () => {
    const page1 = { id: 1, name: 'Folder 1', folderType: 'TEST_CASE' };
    const page2 = { id: 2, name: 'Folder 2', folderType: 'TEST_CASE' };
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(mockOk({ values: [page1], total: 2, startAt: 0, maxResults: 100, isLast: false }))
      .mockResolvedValueOnce(mockOk({ values: [page2], total: 2, startAt: 100, maxResults: 100, isLast: true }));
    vi.stubGlobal('fetch', mockFetch);
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await listFolders({ project: 'PROJ' });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(writeSpy).toHaveBeenCalledWith(
      JSON.stringify({ values: [page1, page2], total: 2 }, null, 2)
    );
  });

  it('sends correct query params', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      mockOk({ values: [], total: 0, startAt: 0, maxResults: 100, isLast: true })
    );
    vi.stubGlobal('fetch', mockFetch);
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await listFolders({ project: 'PROJ' });

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('projectKey=PROJ');
    expect(url).toContain('folderType=TEST_CASE');
    expect(url).toContain('maxResults=100');
  });
});
