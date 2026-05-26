import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCase } from '../../src/commands/get-case';
import { mockOk } from '../mock-response';

describe('get-case', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, TESTINY_API_KEY: 'test-key' };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('throws if --id is missing', async () => {
    await expect(getCase({ id: '' })).rejects.toThrow('--id is required');
  });

  it('throws on non-numeric --id', async () => {
    await expect(getCase({ id: 'abc' })).rejects.toThrow('--id must be numeric');
  });

  it('GETs /testcase/{id} and prints response', async () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const mockFetch = vi
      .fn()
      .mockResolvedValue(mockOk({ id: 42, title: 'Found', _etag: 'abc' }));
    vi.stubGlobal('fetch', mockFetch);

    await getCase({ id: '42' });

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('https://app.testiny.io/api/v1/testcase/42');
    expect(init.method).toBe('GET');
    const out = JSON.parse(writeSpy.mock.calls[0][0] as string);
    expect(out.title).toBe('Found');
  });
});
