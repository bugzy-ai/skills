import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getToken, request } from '../src/figma-client';

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

  it('throws if FIGMA_ACCESS_TOKEN is missing', () => {
    delete process.env.FIGMA_ACCESS_TOKEN;
    expect(() => getToken()).toThrow('FIGMA_ACCESS_TOKEN environment variable is required');
  });
});

describe('request', () => {
  it('sends X-Figma-Token header for PATs', async () => {
    process.env.FIGMA_ACCESS_TOKEN = 'figd_test-pat-token';
    mockFetchFn.mockResolvedValue(mockResponse({ name: 'Test File' }));

    await request('/files/abc123');

    const headers = mockFetchFn.mock.calls[0][1].headers;
    expect(headers['X-Figma-Token']).toBe('figd_test-pat-token');
    expect(headers['Authorization']).toBeUndefined();
  });

  it('sends Authorization Bearer header for OAuth tokens', async () => {
    process.env.FIGMA_ACCESS_TOKEN = 'figu_oauth-token-xyz';
    mockFetchFn.mockResolvedValue(mockResponse({ name: 'Test File' }));

    await request('/files/abc123');

    const headers = mockFetchFn.mock.calls[0][1].headers;
    expect(headers['Authorization']).toBe('Bearer figu_oauth-token-xyz');
    expect(headers['X-Figma-Token']).toBeUndefined();
  });

  it('defaults to X-Figma-Token for tokens without known prefix', async () => {
    process.env.FIGMA_ACCESS_TOKEN = 'some-random-token';
    mockFetchFn.mockResolvedValue(mockResponse({ name: 'Test File' }));

    await request('/files/abc123');

    const headers = mockFetchFn.mock.calls[0][1].headers;
    expect(headers['X-Figma-Token']).toBe('some-random-token');
    expect(headers['Authorization']).toBeUndefined();
  });

  it('constructs correct Figma API v1 URL', async () => {
    mockFetchFn.mockResolvedValue(mockResponse({ name: 'Test' }));

    await request('/files/abc123', { depth: '2' });

    const url = mockFetchFn.mock.calls[0][0] as string;
    expect(url).toContain('api.figma.com/v1/files/abc123');
    expect(url).toContain('depth=2');
  });

  it('constructs URL without params when none provided', async () => {
    mockFetchFn.mockResolvedValue(mockResponse({ name: 'Test' }));

    await request('/files/abc123');

    const url = mockFetchFn.mock.calls[0][0] as string;
    expect(url).toBe('https://api.figma.com/v1/files/abc123');
  });

  it('returns parsed JSON data', async () => {
    const data = { name: 'My Design', version: '123' };
    mockFetchFn.mockResolvedValue(mockResponse(data));

    const result = await request('/files/abc123');
    expect(result).toEqual(data);
  });

  it('retries on 429 with Retry-After header', async () => {
    mockFetchFn.mockResolvedValueOnce(
      mockResponse({ error: 'rate limited' }, 429, { 'Retry-After': '0' })
    );
    mockFetchFn.mockResolvedValueOnce(mockResponse({ name: 'Test' }));

    const result = await request('/files/abc123');

    expect(mockFetchFn).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ name: 'Test' });
  });

  it('gives up after MAX_RETRIES on 429', async () => {
    mockFetchFn.mockResolvedValueOnce(
      mockResponse({ error: 'rate limited' }, 429, { 'Retry-After': '0' })
    );
    mockFetchFn.mockResolvedValueOnce(
      mockResponse({ error: 'still rate limited' }, 429, { 'Retry-After': '0' })
    );

    await expect(request('/files/abc123')).rejects.toThrow('Figma API error 429');
  });

  it('throws on non-ok HTTP response', async () => {
    mockFetchFn.mockResolvedValue(
      mockResponse({ message: 'Not found' }, 404)
    );

    await expect(request('/files/invalid')).rejects.toThrow('Figma API error 404');
  });

  it('throws on 403 forbidden', async () => {
    mockFetchFn.mockResolvedValue(
      mockResponse({ message: 'Forbidden' }, 403)
    );

    await expect(request('/files/private')).rejects.toThrow('Figma API error 403');
  });

  it('handles empty params object', async () => {
    mockFetchFn.mockResolvedValue(mockResponse({ name: 'Test' }));

    await request('/files/abc123', {});

    const url = mockFetchFn.mock.calls[0][0] as string;
    expect(url).toBe('https://api.figma.com/v1/files/abc123');
  });
});
