import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCase } from '../../src/commands/get-case';
import { mockOk } from '../mock-response';

describe('get-case', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, ZEPHYR_API_TOKEN: 'test-token' };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('throws if --key is missing', async () => {
    await expect(getCase({ key: '' })).rejects.toThrow('--key is required');
  });

  it('outputs test case as JSON', async () => {
    const testCase = { id: 1, key: 'PROJ-T42', name: 'My Test', project: { key: 'PROJ' } };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockOk(testCase)));
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await getCase({ key: 'PROJ-T42' });

    expect(writeSpy).toHaveBeenCalledWith(JSON.stringify(testCase, null, 2));
  });
});
