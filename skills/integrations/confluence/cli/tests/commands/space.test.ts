import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { listSpaces } from '../../src/commands/space';

const ENV_BACKUP = { ...process.env };
const mockFetchFn = vi.fn();

beforeEach(() => {
  process.env.CONFLUENCE_ACCESS_TOKEN = 'test-token';
  process.env.CONFLUENCE_CLOUD_ID = 'test-cloud-id';
  mockFetchFn.mockReset();
  vi.stubGlobal('fetch', mockFetchFn);
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  process.env = { ...ENV_BACKUP };
  vi.restoreAllMocks();
});

function mockResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'OK',
    text: () => Promise.resolve(JSON.stringify(data)),
    json: () => Promise.resolve(data),
    headers: new Headers(),
  } as Response;
}

describe('listSpaces', () => {
  it('outputs JSON array of spaces from search results', async () => {
    mockFetchFn.mockResolvedValue(
      mockResponse({
        results: [
          { space: { id: 1, key: 'ENG', name: 'Engineering', type: 'global', status: 'current' }, content: {}, url: '' },
          { space: { id: 2, key: 'PROD', name: 'Product', type: 'global', status: 'current' }, content: {}, url: '' },
        ],
        start: 0,
        limit: 50,
        size: 2,
      })
    );

    await listSpaces();

    expect(console.log).toHaveBeenCalledWith(
      JSON.stringify([
        { key: 'ENG', name: 'Engineering', type: 'global', status: 'current' },
        { key: 'PROD', name: 'Product', type: 'global', status: 'current' },
      ])
    );
  });

  it('uses CQL type=space', async () => {
    mockFetchFn.mockResolvedValue(mockResponse({ results: [], start: 0, limit: 50, size: 0 }));

    await listSpaces();

    const url = mockFetchFn.mock.calls[0][0] as string;
    expect(url).toContain('/search');
    expect(url).toContain('cql=type%3Dspace');
  });

  it('handles empty results', async () => {
    mockFetchFn.mockResolvedValue(mockResponse({ results: [], start: 0, limit: 50, size: 0 }));

    await listSpaces();

    expect(console.log).toHaveBeenCalledWith(JSON.stringify([]));
  });
});
