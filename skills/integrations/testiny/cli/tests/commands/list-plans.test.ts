import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { listPlans } from '../../src/commands/list-plans';
import { mockOk } from '../mock-response';

describe('list-plans', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, TESTINY_API_KEY: 'test-key', TESTINY_PROJECT_ID: '1' };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('throws if neither --project nor env is set', async () => {
    delete process.env.TESTINY_PROJECT_ID;
    await expect(listPlans({})).rejects.toThrow(
      '--project or TESTINY_PROJECT_ID env is required'
    );
  });

  it('POSTs to /testplan/find with filter-only body (no limit — DataReadParams rejects it)', async () => {
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const mockFetch = vi
      .fn()
      .mockResolvedValue(mockOk({ meta: { offset: 0, limit: 2000, count: 1 }, data: [{ id: 1, title: 'A' }] }));
    vi.stubGlobal('fetch', mockFetch);

    await listPlans({});

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('https://app.testiny.io/api/v1/testplan/find');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body);
    expect(body).toEqual({ filter: { project_id: 1 } });
    expect(body.limit).toBeUndefined();
  });

  it('applies --limit client-side (slices the data array)', async () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(mockOk({
        meta: { offset: 0, limit: 2000, count: 5 },
        data: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }],
      })),
    );

    await listPlans({ limit: '2' });

    const out = JSON.parse(writeSpy.mock.calls[0][0] as string);
    expect(out.values).toHaveLength(2);
    expect(out.values[0].id).toBe(1);
    expect(out.values[1].id).toBe(2);
    expect(out.total).toBe(5); // server-reported count, not the slice length
  });

  it('rejects non-numeric --limit', async () => {
    await expect(listPlans({ limit: 'lots' })).rejects.toThrow(
      '--limit must be a positive number'
    );
  });

  it('falls back to items[] if response uses items wrapping', async () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockOk({ items: [{ id: 7 }] })));

    await listPlans({});

    const out = JSON.parse(writeSpy.mock.calls[0][0] as string);
    expect(out.values).toHaveLength(1);
    expect(out.values[0].id).toBe(7);
    expect(out.total).toBe(1);
  });

  it('uses meta.count when present (real Testiny response shape)', async () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(mockOk({ meta: { count: 99 }, data: [{ id: 1 }] })),
    );

    await listPlans({});

    const out = JSON.parse(writeSpy.mock.calls[0][0] as string);
    expect(out.total).toBe(99);
  });
});
