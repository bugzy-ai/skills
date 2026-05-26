import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { request } from '../src/client';
import { mockOk } from './mock-response';

describe('client', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.useFakeTimers();
    process.env = { ...originalEnv, ZEPHYR_API_TOKEN: 'test-token-123' };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('throws if ZEPHYR_API_TOKEN is missing', async () => {
    delete process.env.ZEPHYR_API_TOKEN;
    await expect(request('GET', '/testcases/TEST-T1')).rejects.toThrow(
      'ZEPHYR_API_TOKEN environment variable is required'
    );
  });

  it('sends Bearer auth header', async () => {
    const mockFetch = vi.fn().mockResolvedValue(mockOk({ key: 'TEST-T1' }));
    vi.stubGlobal('fetch', mockFetch);

    const promise = request('GET', '/testcases/TEST-T1');
    await vi.advanceTimersByTimeAsync(0);
    await promise;

    expect(mockFetch).toHaveBeenCalledOnce();
    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer test-token-123');
  });

  it('handles 204 No Content', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 204 })
    );

    const promise = request('DELETE', '/testcases/TEST-T1');
    await vi.advanceTimersByTimeAsync(0);
    const result = await promise;
    expect(result).toEqual({});
  });

  it('throws on non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
        headers: new Map(),
      })
    );

    await expect(request('GET', '/testcases/TEST-T1')).rejects.toThrow(
      'Zephyr API error 401: Unauthorized'
    );
  });

  it('retries on 429 with Retry-After header', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ 'Retry-After': '1' }),
      })
      .mockResolvedValueOnce(mockOk({ key: 'TEST-T1' }));
    vi.stubGlobal('fetch', mockFetch);

    const promise = request('GET', '/testcases/TEST-T1');
    // Advance past timeout + retry delay
    await vi.advanceTimersByTimeAsync(31_000);
    const result = await promise;

    expect(result).toEqual({ key: 'TEST-T1' });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('caps backoff at MAX_BACKOFF_MS (10s)', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ 'Retry-After': '999' }),
      })
      .mockResolvedValueOnce(mockOk({ key: 'TEST-T1' }));
    vi.stubGlobal('fetch', mockFetch);

    const promise = request('GET', '/testcases/TEST-T1');
    // Retry-After 999s should be capped to 10s
    await vi.advanceTimersByTimeAsync(31_000);
    await promise;

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('stops retrying after MAX_RETRIES (3)', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers({ 'Retry-After': '0' }),
      text: () => Promise.resolve('Rate limited'),
    });
    vi.stubGlobal('fetch', mockFetch);

    const promise = request('GET', '/testcases/TEST-T1');
    // Attach rejection handler immediately so Node doesn't flag unhandled rejection
    const caught = promise.catch(() => {});
    // Advance through all retries
    await vi.advanceTimersByTimeAsync(120_000);
    await caught;
    await expect(promise).rejects.toThrow('Zephyr API error 429');

    expect(mockFetch).toHaveBeenCalledTimes(4);
  });

  it('sends query params correctly', async () => {
    const mockFetch = vi.fn().mockResolvedValue(mockOk({ values: [] }));
    vi.stubGlobal('fetch', mockFetch);

    const promise = request('GET', '/testcases', undefined, {
      projectKey: 'PROJ',
      maxResults: 10,
      folderId: undefined,
    });
    await vi.advanceTimersByTimeAsync(0);
    await promise;

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('projectKey=PROJ');
    expect(url).toContain('maxResults=10');
    expect(url).not.toContain('folderId');
  });

  it('sends JSON body for POST requests', async () => {
    const mockFetch = vi.fn().mockResolvedValue(mockOk({ key: 'TEST-T1' }));
    vi.stubGlobal('fetch', mockFetch);

    const promise = request('POST', '/testcases', { projectKey: 'TEST', name: 'My Test' });
    await vi.advanceTimersByTimeAsync(0);
    await promise;

    const [, init] = mockFetch.mock.calls[0];
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ projectKey: 'TEST', name: 'My Test' });
  });

  it('uses exponential backoff when no Retry-After header', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers(),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers(),
      })
      .mockResolvedValueOnce(mockOk({ key: 'TEST-T1' }));
    vi.stubGlobal('fetch', mockFetch);

    const promise = request('GET', '/testcases/TEST-T1');
    // Advance enough for all retries (timeout + backoff delays)
    await vi.advanceTimersByTimeAsync(120_000);
    await promise;

    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('retries on 502 Bad Gateway', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 502,
        headers: new Headers(),
      })
      .mockResolvedValueOnce(mockOk({ key: 'TEST-T1' }));
    vi.stubGlobal('fetch', mockFetch);

    const promise = request('GET', '/testcases/TEST-T1');
    await vi.advanceTimersByTimeAsync(31_000);
    const result = await promise;

    expect(result).toEqual({ key: 'TEST-T1' });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('retries on 503 Service Unavailable', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        headers: new Headers(),
      })
      .mockResolvedValueOnce(mockOk({ key: 'TEST-T1' }));
    vi.stubGlobal('fetch', mockFetch);

    const promise = request('GET', '/testcases/TEST-T1');
    await vi.advanceTimersByTimeAsync(31_000);
    const result = await promise;

    expect(result).toEqual({ key: 'TEST-T1' });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('retries on 504 Gateway Timeout', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 504,
        headers: new Headers(),
      })
      .mockResolvedValueOnce(mockOk({ key: 'TEST-T1' }));
    vi.stubGlobal('fetch', mockFetch);

    const promise = request('GET', '/testcases/TEST-T1');
    await vi.advanceTimersByTimeAsync(31_000);
    const result = await promise;

    expect(result).toEqual({ key: 'TEST-T1' });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});