import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getPlan } from '../../src/commands/get-plan';
import { mockOk } from '../mock-response';

describe('get-plan', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, TESTINY_API_KEY: 'test-key' };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('throws if --id is missing', async () => {
    await expect(getPlan({ id: '' })).rejects.toThrow('--id is required');
  });

  it('throws on non-numeric --id', async () => {
    await expect(getPlan({ id: 'abc' })).rejects.toThrow('--id must be numeric');
  });

  it('GETs /testplan/{id} and prints response', async () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const mockFetch = vi
      .fn()
      .mockResolvedValue(mockOk({ id: 9, name: 'Found Plan', _etag: 'abc' }));
    vi.stubGlobal('fetch', mockFetch);

    await getPlan({ id: '9' });

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('https://app.testiny.io/api/v1/testplan/9');
    expect(init.method).toBe('GET');
    const out = JSON.parse(writeSpy.mock.calls[0][0] as string);
    expect(out.name).toBe('Found Plan');
  });
});
