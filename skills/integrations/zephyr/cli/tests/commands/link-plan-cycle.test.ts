import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { linkPlanCycle } from '../../src/commands/link-plan-cycle';
import { mockOk } from '../mock-response';

describe('link-plan-cycle', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, ZEPHYR_API_TOKEN: 'test-token' };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('reuses an existing test plan to test cycle link', async () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(mockOk({ id: 1, key: 'PROJ-P1', name: 'Plan', project: { id: 1 }, links: { testCycles: [{ id: 10, testCycleId: 5 }] } }))
      .mockResolvedValueOnce(mockOk({ id: 5, key: 'PROJ-R5', name: 'Cycle', project: { id: 1 } }));
    vi.stubGlobal('fetch', mockFetch);

    await linkPlanCycle({ plan: 'PROJ-P1', cycle: 'PROJ-R5' });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(JSON.parse(writeSpy.mock.calls[0][0] as string).created).toBe(false);
  });

  it('reuses an existing link when the plan link target contains the cycle key', async () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(mockOk({ id: 1, key: 'PROJ-P1', name: 'Plan', project: { id: 1 }, links: { testCycles: [{ id: 10, target: 'https://api.example.test/testcycles/PROJ-R5' }] } }))
      .mockResolvedValueOnce(mockOk({ id: 5, key: 'PROJ-R5', name: 'Cycle', project: { id: 1 } }));
    vi.stubGlobal('fetch', mockFetch);

    await linkPlanCycle({ plan: 'PROJ-P1', cycle: 'PROJ-R5' });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(JSON.parse(writeSpy.mock.calls[0][0] as string).created).toBe(false);
  });

  it('creates a missing test plan to test cycle link', async () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(mockOk({ id: 1, key: 'PROJ-P1', name: 'Plan', project: { id: 1 }, links: { testCycles: [] } }))
      .mockResolvedValueOnce(mockOk({ id: 5, key: 'PROJ-R5', name: 'Cycle', project: { id: 1 } }))
      .mockResolvedValueOnce(mockOk({ id: 10, self: 'https://example.test' }));
    vi.stubGlobal('fetch', mockFetch);

    await linkPlanCycle({ plan: 'PROJ-P1', cycle: 'PROJ-R5' });

    expect(mockFetch.mock.calls[2][0]).toContain('/testplans/PROJ-P1/links/testcycles');
    expect(JSON.parse(mockFetch.mock.calls[2][1].body)).toEqual({ testCycleIdOrKey: 'PROJ-R5' });
    expect(JSON.parse(writeSpy.mock.calls[0][0] as string).created).toBe(true);
  });
});
