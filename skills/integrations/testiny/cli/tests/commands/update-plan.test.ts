import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { updatePlan } from '../../src/commands/update-plan';
import { mockOk } from '../mock-response';

describe('update-plan', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, TESTINY_API_KEY: 'test-key' };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('throws if --id is missing', async () => {
    await expect(updatePlan({ id: '' })).rejects.toThrow('--id is required');
  });

  it('PUTs /testplan/{id} directly (no GET-first; TestPlan has no _etag)', async () => {
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const mockFetch = vi
      .fn()
      .mockResolvedValue(mockOk({ id: 9, title: 'New', project_id: 1 }));
    vi.stubGlobal('fetch', mockFetch);

    await updatePlan({ id: '9', name: 'New' });

    // Exactly one fetch — no GET-then-PUT dance.
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('https://app.testiny.io/api/v1/testplan/9');
    expect(init.method).toBe('PUT');
    const body = JSON.parse(init.body);
    expect(body).toEqual({ title: 'New' });
    expect(body._etag).toBeUndefined();
  });

  it('sends only the fields that were passed (minimal PUT body)', async () => {
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const mockFetch = vi
      .fn()
      .mockResolvedValue(mockOk({ id: 9, project_id: 1 }));
    vi.stubGlobal('fetch', mockFetch);

    await updatePlan({ id: '9', description: 'new desc' });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toEqual({ description: 'new desc' });
    expect(body.title).toBeUndefined();
  });

  it('maps --name to title in the PUT body', async () => {
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const mockFetch = vi
      .fn()
      .mockResolvedValue(mockOk({ id: 9, title: 'X', project_id: 1 }));
    vi.stubGlobal('fetch', mockFetch);

    await updatePlan({ id: '9', name: 'Renamed' });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.title).toBe('Renamed');
    expect(body.name).toBeUndefined();
  });
});
