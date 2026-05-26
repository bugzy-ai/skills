import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createCase } from '../../src/commands/create-case';
import { mockOk } from '../mock-response';

describe('create-case', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, ZEPHYR_API_TOKEN: 'test-token' };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('throws if --project is missing', async () => {
    await expect(createCase({ project: '', name: 'Test' })).rejects.toThrow(
      '--project is required'
    );
  });

  it('throws if --name is missing', async () => {
    await expect(createCase({ project: 'PROJ', name: '', folder: '1' })).rejects.toThrow(
      '--name is required'
    );
  });

  it('throws if --folder is missing', async () => {
    await expect(createCase({ project: 'PROJ', name: 'Test', folder: '' })).rejects.toThrow(
      '--folder is required'
    );
  });

  it('creates a test case and outputs key', async () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      mockOk({ key: 'PROJ-T42', id: 1, name: 'My Test', project: { key: 'PROJ' } })
    ));

    await createCase({ project: 'PROJ', name: 'My Test', folder: '123' });

    const output = JSON.parse(writeSpy.mock.calls[0][0] as string);
    expect(output.key).toBe('PROJ-T42');
  });

  it('sends folder ID in body', async () => {
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const mockFetch = vi.fn().mockResolvedValue(
      mockOk({ key: 'PROJ-T1', id: 1, name: 'Test', project: { key: 'PROJ' } })
    );
    vi.stubGlobal('fetch', mockFetch);

    await createCase({ project: 'PROJ', name: 'Test', folder: '456' });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.folderId).toBe(456);
  });

  it('sends optional fields when provided', async () => {
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const mockFetch = vi.fn().mockResolvedValue(
      mockOk({ key: 'PROJ-T1', id: 1, name: 'Test', project: { key: 'PROJ' } })
    );
    vi.stubGlobal('fetch', mockFetch);

    await createCase({
      project: 'PROJ', name: 'Test', folder: '123',
      objective: 'Verify login', precondition: 'User exists',
      labels: 'smoke,regression', priority: 'High', status: 'Draft',
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.objective).toBe('Verify login');
    expect(body.precondition).toBe('User exists');
    expect(body.labels).toEqual(['smoke', 'regression']);
    expect(body.priorityName).toBe('High');
    expect(body.statusName).toBe('Draft');
  });

  it('creates case then posts steps via separate endpoint', async () => {
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(mockOk({ key: 'PROJ-T1', id: 1, name: 'Test', project: { key: 'PROJ' } }))
      .mockResolvedValueOnce(mockOk({ id: 999 }));
    vi.stubGlobal('fetch', mockFetch);

    const steps = JSON.stringify([
      { description: 'Step 1', testData: 'data', expectedResult: 'result' },
    ]);
    await createCase({ project: 'PROJ', name: 'Test', folder: '123', steps });

    // First call creates the case (no testScript in body)
    const createBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(createBody.testScript).toBeUndefined();

    // Second call posts steps to /teststeps endpoint
    expect(mockFetch.mock.calls[1][0]).toContain('/testcases/PROJ-T1/teststeps');
    const stepsBody = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(stepsBody.mode).toBe('OVERWRITE');
    expect(stepsBody.items).toHaveLength(1);
    expect(stepsBody.items[0].inline.description).toBe('Step 1');
  });

  it('throws on invalid steps JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      mockOk({ key: 'PROJ-T1', id: 1, name: 'Test', project: { key: 'PROJ' } })
    ));
    await expect(
      createCase({ project: 'PROJ', name: 'Test', folder: '123', steps: 'not-json' })
    ).rejects.toThrow();
  });
});