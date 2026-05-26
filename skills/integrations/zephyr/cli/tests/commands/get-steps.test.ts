import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getSteps } from '../../src/commands/get-steps';
import { mockOk } from '../mock-response';

describe('get-steps', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, ZEPHYR_API_TOKEN: 'test-token' };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('throws if --key is missing', async () => {
    await expect(getSteps({ key: '' })).rejects.toThrow('--key is required');
  });

  it('outputs test steps values array', async () => {
    const steps = [
      { inline: { description: 'Step 1', testData: '', expectedResult: 'pass' } },
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        mockOk({ values: steps, total: 1, startAt: 0, maxResults: 50, isLast: true })
      )
    );
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await getSteps({ key: 'PROJ-T42' });

    expect(writeSpy).toHaveBeenCalledWith(JSON.stringify(steps, null, 2));
  });

  it('paginates when isLast is false', async () => {
    const page1Steps = [
      { inline: { description: 'Step 1', testData: '', expectedResult: 'r1' } },
    ];
    const page2Steps = [
      { inline: { description: 'Step 2', testData: '', expectedResult: 'r2' } },
    ];
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(
        mockOk({ values: page1Steps, total: 2, startAt: 0, maxResults: 100, isLast: false })
      )
      .mockResolvedValueOnce(
        mockOk({ values: page2Steps, total: 2, startAt: 100, maxResults: 100, isLast: true })
      );
    vi.stubGlobal('fetch', mockFetch);
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await getSteps({ key: 'PROJ-T42' });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    const allSteps = [...page1Steps, ...page2Steps];
    expect(writeSpy).toHaveBeenCalledWith(JSON.stringify(allSteps, null, 2));
  });
});
