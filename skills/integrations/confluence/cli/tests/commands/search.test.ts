import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { searchCQL, searchText } from '../../src/commands/search';

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

describe('searchCQL', () => {
  it('constructs correct v1 URL with CQL', async () => {
    mockFetchFn.mockResolvedValue(
      mockResponse({
        results: [],
        start: 0,
        limit: 25,
        size: 0,
      })
    );

    await searchCQL('type = page AND space = "ENG"');

    const url = mockFetchFn.mock.calls[0][0] as string;
    expect(url).toContain('/wiki/rest/api/search');
    expect(url).toContain('cql=');
  });

  it('maps search results to compact output', async () => {
    mockFetchFn.mockResolvedValue(
      mockResponse({
        results: [
          {
            content: { id: '1', type: 'page', status: 'current', title: 'Auth Guide' },
            resultGlobalContainer: { title: 'Engineering' },
            url: '/wiki/spaces/ENG/pages/1',
            excerpt: 'Authentication guide...',
          },
        ],
        start: 0,
        limit: 25,
        size: 1,
      })
    );

    await searchCQL('title ~ "auth"');

    const output = JSON.parse((console.log as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(output).toHaveLength(1);
    expect(output[0]).toEqual({
      id: '1',
      type: 'page',
      title: 'Auth Guide',
      status: 'current',
      space: 'Engineering',
      url: '/wiki/spaces/ENG/pages/1',
      excerpt: 'Authentication guide...',
    });
  });

  it('passes limit override', async () => {
    mockFetchFn.mockResolvedValue(
      mockResponse({ results: [], start: 0, limit: 50, size: 0 })
    );

    await searchCQL('type = page', '50');

    const url = mockFetchFn.mock.calls[0][0] as string;
    expect(url).toContain('limit=50');
  });

  it('throws if CQL is empty', async () => {
    await expect(searchCQL('')).rejects.toThrow('CQL query is required');
  });
});

describe('searchText', () => {
  it('wraps text query as CQL', async () => {
    mockFetchFn.mockResolvedValue(
      mockResponse({ results: [], start: 0, limit: 25, size: 0 })
    );

    await searchText('login flow');

    const url = mockFetchFn.mock.calls[0][0] as string;
    expect(url).toContain('cql=');
    // The CQL should contain the text query wrapped
    const cqlParam = new URL('http://dummy' + url.split('rest/api')[1]).searchParams.get('cql');
    expect(cqlParam).toContain('login flow');
    expect(cqlParam).toContain('type = page');
  });

  it('throws if query is empty', async () => {
    await expect(searchText('')).rejects.toThrow('Search query is required');
  });
});
