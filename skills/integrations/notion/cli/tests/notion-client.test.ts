import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getToken, request, richTextToPlain, extractPlainText } from '../src/notion-client';

const ENV_BACKUP = { ...process.env };
const mockFetchFn = vi.fn();

beforeEach(() => {
  process.env.NOTION_TOKEN = 'ntn_test-token-123';
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
    expect(getToken()).toBe('ntn_test-token-123');
  });

  it('throws if NOTION_TOKEN is missing', () => {
    delete process.env.NOTION_TOKEN;
    expect(() => getToken()).toThrow('NOTION_TOKEN environment variable is required');
  });
});

describe('request', () => {
  it('sends correct headers', async () => {
    mockFetchFn.mockResolvedValue(mockResponse({ results: [] }));

    await request('GET', '/v1/search');

    expect(mockFetchFn).toHaveBeenCalledWith(
      'https://api.notion.com/v1/search',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer ntn_test-token-123',
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('sends POST body as JSON', async () => {
    mockFetchFn.mockResolvedValue(mockResponse({ results: [] }));

    await request('POST', '/v1/search', { query: 'test' });

    expect(mockFetchFn).toHaveBeenCalledWith(
      'https://api.notion.com/v1/search',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ query: 'test' }),
      })
    );
  });

  it('does not send body for GET requests', async () => {
    mockFetchFn.mockResolvedValue(mockResponse({ id: 'page-1' }));

    await request('GET', '/v1/pages/page-1');

    const callOptions = mockFetchFn.mock.calls[0][1];
    expect(callOptions.body).toBeUndefined();
  });

  it('returns parsed JSON data', async () => {
    const data = { id: 'page-1', url: 'https://notion.so/page-1' };
    mockFetchFn.mockResolvedValue(mockResponse(data));

    const result = await request('GET', '/v1/pages/page-1');
    expect(result).toEqual(data);
  });

  it('retries on 429 with Retry-After header', async () => {
    mockFetchFn.mockResolvedValueOnce(
      mockResponse({ error: 'rate limited' }, 429, { 'Retry-After': '0' })
    );
    mockFetchFn.mockResolvedValueOnce(mockResponse({ results: [] }));

    const result = await request('POST', '/v1/search', { query: 'test' });

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

    await expect(request('GET', '/v1/search')).rejects.toThrow('Notion API error 429');
  });

  it('throws on non-ok HTTP response', async () => {
    mockFetchFn.mockResolvedValue(
      mockResponse({ message: 'Not found' }, 404)
    );

    await expect(request('GET', '/v1/pages/bad-id')).rejects.toThrow('Notion API error 404');
  });
});

describe('richTextToPlain', () => {
  it('concatenates plain_text from rich text array', () => {
    const rt = [
      { plain_text: 'Hello ' },
      { plain_text: 'world' },
    ];
    expect(richTextToPlain(rt)).toBe('Hello world');
  });

  it('returns empty string for empty array', () => {
    expect(richTextToPlain([])).toBe('');
  });
});

describe('extractPlainText', () => {
  it('extracts text from paragraph blocks', () => {
    const blocks = [
      { id: '1', type: 'paragraph', paragraph: { rich_text: [{ plain_text: 'First paragraph' }] } },
      { id: '2', type: 'paragraph', paragraph: { rich_text: [{ plain_text: 'Second paragraph' }] } },
    ];
    expect(extractPlainText(blocks)).toBe('First paragraph\nSecond paragraph');
  });

  it('extracts text from heading blocks', () => {
    const blocks = [
      { id: '1', type: 'heading_1', heading_1: { rich_text: [{ plain_text: 'Title' }] } },
      { id: '2', type: 'paragraph', paragraph: { rich_text: [{ plain_text: 'Content' }] } },
    ];
    expect(extractPlainText(blocks)).toBe('Title\nContent');
  });

  it('skips blocks without rich_text', () => {
    const blocks = [
      { id: '1', type: 'divider', divider: {} },
      { id: '2', type: 'paragraph', paragraph: { rich_text: [{ plain_text: 'After divider' }] } },
    ];
    expect(extractPlainText(blocks)).toBe('After divider');
  });

  it('returns empty string for empty block array', () => {
    expect(extractPlainText([])).toBe('');
  });
});
