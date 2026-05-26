import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { request } from '../src/client';
import { mockOk } from './mock-response';

describe('client', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.useFakeTimers();
    process.env = { ...originalEnv, TESTINY_API_KEY: 'test-key-123' };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('throws if TESTINY_API_KEY is missing', async () => {
    delete process.env.TESTINY_API_KEY;
    await expect(request('GET', '/testcase/1')).rejects.toThrow(
      'TESTINY_API_KEY environment variable is required'
    );
  });

  it('sends X-Api-Key header (not Bearer)', async () => {
    const mockFetch = vi.fn().mockResolvedValue(mockOk({ id: 1 }));
    vi.stubGlobal('fetch', mockFetch);

    const promise = request('GET', '/testcase/1');
    await vi.advanceTimersByTimeAsync(0);
    await promise;

    expect(mockFetch).toHaveBeenCalledOnce();
    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers['X-Api-Key']).toBe('test-key-123');
    expect(init.headers.Authorization).toBeUndefined();
  });

  it('uses default base URL https://app.testiny.io', async () => {
    const mockFetch = vi.fn().mockResolvedValue(mockOk({ id: 1 }));
    vi.stubGlobal('fetch', mockFetch);

    const promise = request('GET', '/testcase/1');
    await vi.advanceTimersByTimeAsync(0);
    await promise;

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe('https://app.testiny.io/api/v1/testcase/1');
  });

  it('honors TESTINY_APP_URL override', async () => {
    process.env.TESTINY_APP_URL = 'https://self-hosted.example.com';
    const mockFetch = vi.fn().mockResolvedValue(mockOk({ id: 1 }));
    vi.stubGlobal('fetch', mockFetch);

    const promise = request('GET', '/testcase/1');
    await vi.advanceTimersByTimeAsync(0);
    await promise;

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe('https://self-hosted.example.com/api/v1/testcase/1');
  });

  it('handles 204 No Content', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204 }));

    const promise = request('DELETE', '/testcase/1');
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

    await expect(request('GET', '/testcase/1')).rejects.toThrow(
      'Testiny API error 401: Unauthorized'
    );
  });

  it('retries on 429 with fixed exponential backoff (no Retry-After)', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429, headers: new Headers() })
      .mockResolvedValueOnce(mockOk({ id: 1 }));
    vi.stubGlobal('fetch', mockFetch);

    const promise = request('GET', '/testcase/1');
    await vi.advanceTimersByTimeAsync(31_000);
    const result = await promise;

    expect(result).toEqual({ id: 1 });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('stops retrying after MAX_RETRIES (3)', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers(),
      text: () => Promise.resolve('Rate limited'),
    });
    vi.stubGlobal('fetch', mockFetch);

    const promise = request('GET', '/testcase/1');
    const caught = promise.catch(() => {});
    await vi.advanceTimersByTimeAsync(120_000);
    await caught;
    await expect(promise).rejects.toThrow('Testiny API error 429');

    expect(mockFetch).toHaveBeenCalledTimes(4);
  });

  it('retries on 502, 503, 504', async () => {
    for (const status of [502, 503, 504]) {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({ ok: false, status, headers: new Headers() })
        .mockResolvedValueOnce(mockOk({ id: 1 }));
      vi.stubGlobal('fetch', mockFetch);

      const promise = request('GET', '/testcase/1');
      await vi.advanceTimersByTimeAsync(31_000);
      await promise;

      expect(mockFetch).toHaveBeenCalledTimes(2);
    }
  });

  it('sends JSON body for POST requests', async () => {
    const mockFetch = vi.fn().mockResolvedValue(mockOk({ id: 1 }));
    vi.stubGlobal('fetch', mockFetch);

    const promise = request('POST', '/testcase', { project_id: 1, title: 'My Test' });
    await vi.advanceTimersByTimeAsync(0);
    await promise;

    const [, init] = mockFetch.mock.calls[0];
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ project_id: 1, title: 'My Test' });
  });

  it('sends query params correctly', async () => {
    const mockFetch = vi.fn().mockResolvedValue(mockOk({ data: [] }));
    vi.stubGlobal('fetch', mockFetch);

    const promise = request('GET', '/testcase', undefined, {
      project_id: 1,
      limit: 50,
      cursor: undefined,
    });
    await vi.advanceTimersByTimeAsync(0);
    await promise;

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('project_id=1');
    expect(url).toContain('limit=50');
    expect(url).not.toContain('cursor');
  });
});
