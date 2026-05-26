import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { listFiles } from '../../src/commands/project';

const ENV_BACKUP = { ...process.env };
const mockFetchFn = vi.fn();

beforeEach(() => {
  process.env.FIGMA_ACCESS_TOKEN = 'test-token-123';
  mockFetchFn.mockReset();
  vi.stubGlobal('fetch', mockFetchFn);
});

afterEach(() => {
  process.env = { ...ENV_BACKUP };
  vi.restoreAllMocks();
});

function mockResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(data)),
    json: () => Promise.resolve(data),
    headers: new Headers(),
  } as Response;
}

describe('listFiles', () => {
  it('lists files in a project', async () => {
    mockFetchFn.mockResolvedValue(mockResponse({
      files: [
        { key: 'abc123', name: 'Design System', thumbnail_url: 'https://...', last_modified: '2026-02-25T00:00:00Z' },
        { key: 'def456', name: 'Marketing Pages', thumbnail_url: 'https://...', last_modified: '2026-02-24T00:00:00Z' },
      ],
    }));

    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await listFiles('proj-123');

    const output = JSON.parse(spy.mock.calls[0][0]);
    expect(output).toEqual([
      { key: 'abc123', name: 'Design System', lastModified: '2026-02-25T00:00:00Z', thumbnailUrl: 'https://...' },
      { key: 'def456', name: 'Marketing Pages', lastModified: '2026-02-24T00:00:00Z', thumbnailUrl: 'https://...' },
    ]);
    expect(mockFetchFn.mock.calls[0][0]).toContain('/v1/projects/proj-123/files');
    spy.mockRestore();
  });

  it('throws if no project ID provided', async () => {
    await expect(listFiles('')).rejects.toThrow('Project ID is required');
  });

  it('handles empty files list', async () => {
    mockFetchFn.mockResolvedValue(mockResponse({ files: [] }));

    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await listFiles('proj-123');

    expect(JSON.parse(spy.mock.calls[0][0])).toEqual([]);
    spy.mockRestore();
  });

  it('constructs correct API URL', async () => {
    mockFetchFn.mockResolvedValue(mockResponse({ files: [] }));

    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await listFiles('proj-789');

    const url = mockFetchFn.mock.calls[0][0] as string;
    expect(url).toBe('https://api.figma.com/v1/projects/proj-789/files');
    spy.mockRestore();
  });
});
