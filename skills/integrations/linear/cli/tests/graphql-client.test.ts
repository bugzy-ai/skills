import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { query } from '../src/graphql-client';

describe('graphql-client', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.LINEAR_API_KEY = 'lin_api_test_token';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe('authentication', () => {
    it('throws when LINEAR_API_KEY is missing', async () => {
      delete process.env.LINEAR_API_KEY;
      await expect(query('{ viewer { id } }')).rejects.toThrow(
        'LINEAR_API_KEY environment variable is required'
      );
    });

    it('sends API key in Authorization header', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { viewer: { id: '1' } } }),
      });
      vi.stubGlobal('fetch', mockFetch);

      await query('{ viewer { id } }');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.linear.app/graphql',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'lin_api_test_token',
          },
        })
      );
    });
  });

  describe('request format', () => {
    it('sends query string and variables as JSON body', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { teams: [] } }),
      });
      vi.stubGlobal('fetch', mockFetch);

      await query('query Teams($first: Int) { teams(first: $first) { nodes { id } } }', {
        first: 10,
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.query).toContain('teams');
      expect(body.variables).toEqual({ first: 10 });
    });

    it('sends query without variables when none provided', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { viewer: {} } }),
      });
      vi.stubGlobal('fetch', mockFetch);

      await query('{ viewer { id } }');

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.variables).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('throws on 429 rate limit with clear message', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 429,
          text: () => Promise.resolve('Too Many Requests'),
        })
      );

      await expect(query('{ viewer { id } }')).rejects.toThrow(
        'Linear API rate limit exceeded (429)'
      );
    });

    it('throws on non-ok HTTP response with status and body', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
          text: () => Promise.resolve('Unauthorized'),
        })
      );

      await expect(query('{ viewer { id } }')).rejects.toThrow(
        'Linear API error 401: Unauthorized'
      );
    });

    it('throws on GraphQL-level errors', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              data: null,
              errors: [
                { message: 'Field "foo" not found' },
                { message: 'Permission denied' },
              ],
            }),
        })
      );

      await expect(query('{ foo }')).rejects.toThrow(
        'Linear GraphQL error: Field "foo" not found; Permission denied'
      );
    });

    it('throws on empty data response', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({}),
        })
      );

      await expect(query('{ viewer { id } }')).rejects.toThrow(
        'Linear API returned empty data'
      );
    });
  });

  describe('successful responses', () => {
    it('returns data from successful response', async () => {
      const expectedData = { teams: { nodes: [{ id: '1', key: 'ENG', name: 'Engineering' }] } };
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ data: expectedData }),
        })
      );

      const result = await query('{ teams { nodes { id key name } } }');
      expect(result).toEqual(expectedData);
    });
  });
});
