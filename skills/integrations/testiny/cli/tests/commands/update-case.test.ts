import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { updateCase } from '../../src/commands/update-case';
import { mockOk } from '../mock-response';

describe('update-case', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, TESTINY_API_KEY: 'test-key' };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('throws if --id is missing', async () => {
    await expect(updateCase({ id: '' })).rejects.toThrow('--id is required');
  });

  it('GETs the case first to capture _etag then PUTs with _etag echoed back', async () => {
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(mockOk({ id: 42, title: 'Old', _etag: 'etag-1', template: 'STEPS' }))
      .mockResolvedValueOnce(mockOk({ id: 42, title: 'New', _etag: 'etag-2', template: 'STEPS' }));
    vi.stubGlobal('fetch', mockFetch);

    await updateCase({ id: '42', name: 'New' });

    const [getUrl, getInit] = mockFetch.mock.calls[0];
    expect(getUrl).toBe('https://app.testiny.io/api/v1/testcase/42');
    expect(getInit.method).toBe('GET');

    const [putUrl, putInit] = mockFetch.mock.calls[1];
    expect(putUrl).toBe('https://app.testiny.io/api/v1/testcase/42');
    expect(putInit.method).toBe('PUT');

    const body = JSON.parse(putInit.body);
    expect(body._etag).toBe('etag-1');
    expect(body.title).toBe('New');
  });

  it('sends only the fields that were passed (minimal PUT body)', async () => {
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(
        mockOk({ id: 42, title: 'Old', _etag: 'etag-1', template: 'STEPS', steps_text: 'old steps' })
      )
      .mockResolvedValueOnce(mockOk({ id: 42, _etag: 'etag-2' }));
    vi.stubGlobal('fetch', mockFetch);

    await updateCase({ id: '42', steps: 'new steps' });

    const body = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(body).toEqual({ _etag: 'etag-1', steps_text: 'new steps' });
    expect(body.title).toBeUndefined();
  });

  it('rejects unknown --template', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(mockOk({ id: 42, _etag: 'etag-1' }))
    );
    await expect(updateCase({ id: '42', template: 'WIKI' })).rejects.toThrow(
      '--template must be STEPS or TEXT'
    );
  });
});
