import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getPage, listChildren } from '../../src/commands/page';

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

describe('getPage', () => {
  it('outputs page with stripped body from search results', async () => {
    mockFetchFn.mockResolvedValue(
      mockResponse({
        results: [{
          content: {
            id: '123',
            title: 'Test Page',
            status: 'current',
            space: { id: 1, key: 'ENG', name: 'Engineering', type: 'global', status: 'current' },
            version: { number: 3 },
            body: { storage: { value: '<p>Hello <strong>world</strong></p>', representation: 'storage' } },
            metadata: { labels: { results: [{ id: 'l1', name: 'requirements', prefix: 'global' }] } },
            _links: { webui: '/wiki/spaces/ENG/pages/123' },
          },
          url: '/wiki/spaces/ENG/pages/123',
        }],
        start: 0,
        limit: 1,
        size: 1,
      })
    );

    await getPage('123');

    const output = JSON.parse((console.log as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(output.id).toBe('123');
    expect(output.title).toBe('Test Page');
    expect(output.body).toBe('Hello world');
    expect(output.labels).toEqual(['requirements']);
    expect(output.spaceKey).toBe('ENG');
  });

  it('handles page without body', async () => {
    mockFetchFn.mockResolvedValue(
      mockResponse({
        results: [{
          content: {
            id: '456',
            title: 'Empty Page',
            status: 'current',
          },
          url: '',
        }],
        start: 0,
        limit: 1,
        size: 1,
      })
    );

    await getPage('456');

    const output = JSON.parse((console.log as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(output.body).toBe('');
  });

  it('throws if page-id is missing', async () => {
    await expect(getPage('')).rejects.toThrow('Page ID is required');
  });

  it('throws if page not found', async () => {
    mockFetchFn.mockResolvedValue(
      mockResponse({ results: [], start: 0, limit: 1, size: 0 })
    );

    await expect(getPage('999')).rejects.toThrow('Page 999 not found');
  });

  it('uses CQL with expand for body and metadata', async () => {
    mockFetchFn.mockResolvedValue(
      mockResponse({
        results: [{
          content: { id: '789', title: 'Page', status: 'current' },
          url: '',
        }],
        start: 0,
        limit: 1,
        size: 1,
      })
    );

    await getPage('789');

    const url = mockFetchFn.mock.calls[0][0] as string;
    expect(url).toContain('/search');
    expect(url).toContain('cql=');
    expect(url).toContain('expand=');
    expect(url).toContain('content.body.storage');
  });
});

describe('listChildren', () => {
  it('outputs JSON array of children from search results', async () => {
    mockFetchFn.mockResolvedValue(
      mockResponse({
        results: [
          { content: { id: 'c1', title: 'Child 1', status: 'current' }, url: '' },
          { content: { id: 'c2', title: 'Child 2', status: 'current' }, url: '' },
        ],
        start: 0,
        limit: 25,
        size: 2,
      })
    );

    await listChildren('123');

    expect(console.log).toHaveBeenCalledWith(
      JSON.stringify([
        { id: 'c1', title: 'Child 1', status: 'current' },
        { id: 'c2', title: 'Child 2', status: 'current' },
      ])
    );
  });

  it('uses CQL parent= query', async () => {
    mockFetchFn.mockResolvedValue(
      mockResponse({ results: [], start: 0, limit: 10, size: 0 })
    );

    await listChildren('123', '10');

    const url = mockFetchFn.mock.calls[0][0] as string;
    expect(url).toContain('/search');
    expect(url).toContain('cql=parent%3D123');
    expect(url).toContain('limit=10');
  });

  it('throws if page-id is missing', async () => {
    await expect(listChildren('')).rejects.toThrow('Page ID is required');
  });
});
