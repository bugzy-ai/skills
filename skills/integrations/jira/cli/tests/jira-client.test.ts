import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { request, getToken, getCloudId, textToAdf } from '../src/jira-client';

describe('jira-client', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.JIRA_CLOUD_TOKEN = 'test-oauth-token';
    process.env.JIRA_CLOUD_ID = 'test-cloud-id-123';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe('getToken', () => {
    it('returns token when set', () => {
      expect(getToken()).toBe('test-oauth-token');
    });

    it('throws when JIRA_CLOUD_TOKEN is missing', () => {
      delete process.env.JIRA_CLOUD_TOKEN;
      expect(() => getToken()).toThrow('JIRA_CLOUD_TOKEN environment variable is required');
    });
  });

  describe('getCloudId', () => {
    it('returns cloud ID when set', () => {
      expect(getCloudId()).toBe('test-cloud-id-123');
    });

    it('throws when JIRA_CLOUD_ID is missing', () => {
      delete process.env.JIRA_CLOUD_ID;
      expect(() => getCloudId()).toThrow('JIRA_CLOUD_ID environment variable is required');
    });
  });

  describe('request', () => {
    it('sends Bearer auth header and correct URL', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ key: 'PROJ-1' }),
      });
      vi.stubGlobal('fetch', mockFetch);

      await request('GET', '/issue/PROJ-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.atlassian.com/ex/jira/test-cloud-id-123/rest/api/3/issue/PROJ-1',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-oauth-token',
            Accept: 'application/json',
          }),
        })
      );
    });

    it('sends JSON body for POST requests', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ id: '10100' }),
      });
      vi.stubGlobal('fetch', mockFetch);

      await request('POST', '/issue', { fields: { summary: 'Test' } });

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers['Content-Type']).toBe('application/json');
      expect(JSON.parse(callArgs[1].body)).toEqual({ fields: { summary: 'Test' } });
    });

    it('handles 204 No Content', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: true, status: 204 })
      );

      const result = await request<object>('PUT', '/issue/PROJ-1');
      expect(result).toEqual({});
    });

    it('throws on 401 with error message', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ message: 'Unauthorized' }),
          headers: new Map(),
        })
      );

      await expect(request('GET', '/issue/PROJ-1')).rejects.toThrow(
        'Jira API error 401'
      );
    });

    it('throws with parsed errorMessages from Jira', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 400,
          json: () =>
            Promise.resolve({
              errorMessages: ['Field "foo" is required'],
              errors: { summary: 'cannot be empty' },
            }),
          headers: new Map(),
        })
      );

      await expect(request('POST', '/issue')).rejects.toThrow(
        'Field "foo" is required; summary: cannot be empty'
      );
    });

    it('retries on 429 and succeeds', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: new Map([['Retry-After', '0']]),
          json: () => Promise.resolve({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ key: 'PROJ-1' }),
        });
      vi.stubGlobal('fetch', mockFetch);

      const result = await request<{ key: string }>('GET', '/issue/PROJ-1');
      expect(result.key).toBe('PROJ-1');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('throws when JIRA_CLOUD_TOKEN is missing', async () => {
      delete process.env.JIRA_CLOUD_TOKEN;
      await expect(request('GET', '/issue/PROJ-1')).rejects.toThrow(
        'JIRA_CLOUD_TOKEN environment variable is required'
      );
    });

    it('throws when JIRA_CLOUD_ID is missing', async () => {
      delete process.env.JIRA_CLOUD_ID;
      await expect(request('GET', '/issue/PROJ-1')).rejects.toThrow(
        'JIRA_CLOUD_ID environment variable is required'
      );
    });
  });

  describe('textToAdf', () => {
    it('converts single line to ADF', () => {
      const result = textToAdf('Hello world');
      expect(result).toEqual({
        version: 1,
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Hello world' }],
          },
        ],
      });
    });

    it('converts multiline text to ADF paragraphs', () => {
      const result = textToAdf('Line 1\nLine 2\nLine 3');
      expect(result).toEqual({
        version: 1,
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'Line 1' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'Line 2' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'Line 3' }] },
        ],
      });
    });

    it('handles empty lines as empty paragraphs', () => {
      const result = textToAdf('Line 1\n\nLine 3');
      expect(result).toEqual({
        version: 1,
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'Line 1' }] },
          { type: 'paragraph', content: [] },
          { type: 'paragraph', content: [{ type: 'text', text: 'Line 3' }] },
        ],
      });
    });
  });
});
