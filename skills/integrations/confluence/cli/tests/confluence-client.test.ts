import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getToken, getCloudId, request, stripHtml } from '../src/confluence-client';

const ENV_BACKUP = { ...process.env };
const mockFetchFn = vi.fn();

beforeEach(() => {
  process.env.CONFLUENCE_ACCESS_TOKEN = 'test-token-123';
  process.env.CONFLUENCE_CLOUD_ID = 'cloud-id-456';
  mockFetchFn.mockReset();
  vi.stubGlobal('fetch', mockFetchFn);
});

afterEach(() => {
  process.env = { ...ENV_BACKUP };
  vi.restoreAllMocks();
});

function mockResponse(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    text: () => Promise.resolve(JSON.stringify(data)),
    json: () => Promise.resolve(data),
    headers: new Headers(headers),
  } as Response;
}

describe('getToken', () => {
  it('returns token when set', () => {
    expect(getToken()).toBe('test-token-123');
  });

  it('throws if CONFLUENCE_ACCESS_TOKEN is missing', () => {
    delete process.env.CONFLUENCE_ACCESS_TOKEN;
    expect(() => getToken()).toThrow('CONFLUENCE_ACCESS_TOKEN environment variable is required');
  });
});

describe('getCloudId', () => {
  it('returns cloudId when set', () => {
    expect(getCloudId()).toBe('cloud-id-456');
  });

  it('throws if CONFLUENCE_CLOUD_ID is missing', () => {
    delete process.env.CONFLUENCE_CLOUD_ID;
    expect(() => getCloudId()).toThrow('CONFLUENCE_CLOUD_ID environment variable is required');
  });
});

describe('request', () => {
  it('sends Bearer token in Authorization header', async () => {
    mockFetchFn.mockResolvedValue(mockResponse({ results: [] }));

    await request('/search', { cql: 'type=page' });

    expect(mockFetchFn).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token-123',
        }),
      })
    );
  });

  it('constructs correct v1 URL', async () => {
    mockFetchFn.mockResolvedValue(mockResponse({ results: [], start: 0, limit: 25, size: 0 }));

    await request('/search', { cql: 'type = page', limit: '25' });

    const url = mockFetchFn.mock.calls[0][0] as string;
    expect(url).toContain('api.atlassian.com/ex/confluence/cloud-id-456/wiki/rest/api/search');
    expect(url).toContain('cql=type');
    expect(url).toContain('limit=25');
  });

  it('returns parsed JSON data', async () => {
    const data = { results: [{ id: '1', name: 'Test Space' }] };
    mockFetchFn.mockResolvedValue(mockResponse(data));

    const result = await request('/search', { cql: 'type=space' });
    expect(result).toEqual(data);
  });

  it('retries on 429 with Retry-After header', async () => {
    mockFetchFn.mockResolvedValueOnce(
      mockResponse({ error: 'rate limited' }, 429, { 'Retry-After': '0' })
    );
    mockFetchFn.mockResolvedValueOnce(mockResponse({ results: [] }));

    const result = await request('/search', { cql: 'type=page' });

    expect(mockFetchFn).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ results: [] });
  });

  it('gives up after MAX_RETRIES on 429', async () => {
    mockFetchFn.mockResolvedValueOnce(
      mockResponse({ error: 'rate limited' }, 429, { 'Retry-After': '0' })
    );
    mockFetchFn.mockResolvedValueOnce(
      mockResponse({ error: 'still rate limited' }, 429, { 'Retry-After': '0' })
    );

    await expect(request('/search', { cql: 'type=page' })).rejects.toThrow('Confluence API error 429');
  });

  it('throws on non-ok HTTP response', async () => {
    mockFetchFn.mockResolvedValue(
      mockResponse({ message: 'Not found' }, 404)
    );

    await expect(request('/search', { cql: 'id=999' })).rejects.toThrow('Confluence API error 404');
  });
});

describe('stripHtml', () => {
  it('removes HTML tags', () => {
    expect(stripHtml('<p>Hello <strong>world</strong></p>')).toBe('Hello world');
  });

  it('decodes HTML entities', () => {
    expect(stripHtml('&amp; &lt; &gt; &quot; &#39;')).toBe('& < > " \'');
    expect(stripHtml('hello&nbsp;world')).toBe('hello world');
  });

  it('converts br tags to newlines', () => {
    expect(stripHtml('line1<br/>line2<br />line3')).toBe('line1\nline2\nline3');
  });

  it('converts block-level closing tags to newlines', () => {
    expect(stripHtml('<p>para1</p><p>para2</p>')).toBe('para1\npara2');
  });

  it('collapses multiple blank lines', () => {
    expect(stripHtml('<p>a</p>\n\n\n<p>b</p>')).toBe('a\n\nb');
  });

  it('handles empty string', () => {
    expect(stripHtml('')).toBe('');
  });
});
