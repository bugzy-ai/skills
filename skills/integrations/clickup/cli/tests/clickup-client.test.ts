import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { request, getApiToken, getTeamId } from '../src/clickup-client';

describe('clickup-client', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.CLICKUP_API_TOKEN = 'pk_test_token';
    process.env.CLICKUP_TEAM_ID = '12345';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe('authentication', () => {
    it('throws when CLICKUP_API_TOKEN is missing', () => {
      delete process.env.CLICKUP_API_TOKEN;
      expect(() => getApiToken()).toThrow(
        'CLICKUP_API_TOKEN environment variable is required'
      );
    });

    it('returns token when set', () => {
      expect(getApiToken()).toBe('pk_test_token');
    });

    it('throws when CLICKUP_TEAM_ID is missing', () => {
      delete process.env.CLICKUP_TEAM_ID;
      expect(() => getTeamId()).toThrow(
        'CLICKUP_TEAM_ID environment variable is required'
      );
    });

    it('returns team ID when set', () => {
      expect(getTeamId()).toBe('12345');
    });

    it('sends token in Authorization header', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ tasks: [] }),
      });
      vi.stubGlobal('fetch', mockFetch);

      await request('GET', '/team/12345/task');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.clickup.com/api/v2/team/12345/task',
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'pk_test_token',
          },
        })
      );
    });
  });

  describe('error handling', () => {
    it('throws on 429 rate limit when no reset header', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 429,
          headers: new Headers({}),
          text: () => Promise.resolve('Rate limit exceeded'),
        })
      );

      await expect(request('GET', '/task/abc')).rejects.toThrow(
        'ClickUp API rate limit exceeded (429)'
      );
    });

    it('retries on 429 when reset header is near', async () => {
      const now = Date.now();
      const resetTime = Math.floor((now + 500) / 1000); // 500ms in the future

      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: new Headers({
            'X-RateLimit-Reset': String(resetTime),
          }),
          text: () => Promise.resolve('Rate limit exceeded'),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve({ id: 'task1' }),
        });

      vi.stubGlobal('fetch', mockFetch);

      const result = await request('GET', '/task/abc');
      expect(result).toEqual({ id: 'task1' });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('throws on non-ok HTTP response with status and body', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
          headers: new Headers({}),
          text: () => Promise.resolve('Unauthorized'),
        })
      );

      await expect(request('GET', '/task/abc')).rejects.toThrow(
        'ClickUp API error 401: Unauthorized'
      );
    });
  });

  describe('successful responses', () => {
    it('returns parsed JSON from successful response', async () => {
      const expectedData = { tasks: [{ id: '1', name: 'Test task' }] };
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve(expectedData),
        })
      );

      const result = await request('GET', '/team/12345/task');
      expect(result).toEqual(expectedData);
    });

    it('sends body for POST requests', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ id: 'new-task' }),
      });
      vi.stubGlobal('fetch', mockFetch);

      await request('POST', '/list/123/task', { name: 'New task' });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body).toEqual({ name: 'New task' });
    });
  });
});
