import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { updateCase } from '../../src/commands/update-case';
import { mockOk, mockEmpty } from '../mock-response';

// Real API returns {id, self} refs — not {name}
const EXISTING_CASE = {
  id: 100,
  key: 'PROJ-T42',
  name: 'Original Name',
  objective: 'Original objective',
  precondition: 'Original precondition',
  project: { id: 627, self: 'https://api.zephyrscale.smartbear.com/v2/projects/627' },
  priority: { id: 10, self: 'https://api.zephyrscale.smartbear.com/v2/priorities/10' },
  status: { id: 20, self: 'https://api.zephyrscale.smartbear.com/v2/statuses/20' },
  folder: { id: 30, self: 'https://api.zephyrscale.smartbear.com/v2/folders/30' },
};

const PRIORITIES = {
  values: [
    { id: 10, name: 'Normal' },
    { id: 11, name: 'High' },
    { id: 12, name: 'Low' },
  ],
  total: 3, startAt: 0, maxResults: 50, isLast: true,
};

const STATUSES = {
  values: [
    { id: 20, name: 'Draft' },
    { id: 21, name: 'Approved' },
  ],
  total: 2, startAt: 0, maxResults: 50, isLast: true,
};

describe('update-case', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, ZEPHYR_API_TOKEN: 'test-token' };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('throws if --key is missing', async () => {
    await expect(updateCase({ key: '' })).rejects.toThrow('--key is required');
  });

  it('fetches existing case then PUTs with object refs', async () => {
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(mockOk(EXISTING_CASE)) // GET testcase
      .mockResolvedValueOnce(mockEmpty());            // PUT testcase
    vi.stubGlobal('fetch', mockFetch);

    await updateCase({ key: 'PROJ-T42', name: 'Updated Name' });

    expect(mockFetch.mock.calls[0][0]).toContain('/testcases/PROJ-T42');
    expect(mockFetch.mock.calls[0][1].method).toBe('GET');

    const body = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(body.id).toBe(100);
    expect(body.key).toBe('PROJ-T42');
    expect(body.project).toEqual({ id: 627 });
    expect(body.name).toBe('Updated Name');
    expect(body.priority).toEqual(EXISTING_CASE.priority);
    expect(body.status).toEqual(EXISTING_CASE.status);
    expect(body.folder).toEqual(EXISTING_CASE.folder);
  });

  it('keeps existing name when --name not provided', async () => {
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(mockOk(EXISTING_CASE)) // GET testcase
      .mockResolvedValueOnce(mockOk(STATUSES))       // GET statuses
      .mockResolvedValueOnce(mockEmpty());            // PUT testcase
    vi.stubGlobal('fetch', mockFetch);

    await updateCase({ key: 'PROJ-T42', status: 'Approved' });

    const body = JSON.parse(mockFetch.mock.calls[2][1].body);
    expect(body.name).toBe('Original Name');
    expect(body.status).toEqual({ id: 21 });
  });

  it('resolves priority name to ID via API', async () => {
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(mockOk(EXISTING_CASE)) // GET testcase
      .mockResolvedValueOnce(mockOk(PRIORITIES))     // GET priorities
      .mockResolvedValueOnce(mockEmpty());            // PUT testcase
    vi.stubGlobal('fetch', mockFetch);

    await updateCase({ key: 'PROJ-T42', priority: 'High' });

    // Should have called /priorities
    expect(mockFetch.mock.calls[1][0]).toContain('/priorities');

    const body = JSON.parse(mockFetch.mock.calls[2][1].body);
    expect(body.priority).toEqual({ id: 11 });
    expect(body.name).toBe('Original Name');
  });

  it('resolves status name to ID via API', async () => {
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(mockOk(EXISTING_CASE)) // GET testcase
      .mockResolvedValueOnce(mockOk(STATUSES))       // GET statuses
      .mockResolvedValueOnce(mockEmpty());            // PUT testcase
    vi.stubGlobal('fetch', mockFetch);

    await updateCase({ key: 'PROJ-T42', status: 'Approved' });

    expect(mockFetch.mock.calls[1][0]).toContain('/statuses');

    const body = JSON.parse(mockFetch.mock.calls[2][1].body);
    expect(body.status).toEqual({ id: 21 });
  });

  it('throws on unknown priority name', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(mockOk(EXISTING_CASE))
      .mockResolvedValueOnce(mockOk(PRIORITIES));
    vi.stubGlobal('fetch', mockFetch);

    await expect(
      updateCase({ key: 'PROJ-T42', priority: 'Nonexistent' })
    ).rejects.toThrow('Unknown priority: "Nonexistent"');
  });

  it('throws on unknown status name', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(mockOk(EXISTING_CASE))
      .mockResolvedValueOnce(mockOk(STATUSES));
    vi.stubGlobal('fetch', mockFetch);

    await expect(
      updateCase({ key: 'PROJ-T42', status: 'Nonexistent' })
    ).rejects.toThrow('Unknown status: "Nonexistent"');
  });

  it('sends objective, precondition, labels, and resolves priority', async () => {
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(mockOk(EXISTING_CASE)) // GET testcase
      .mockResolvedValueOnce(mockOk(PRIORITIES))     // GET priorities
      .mockResolvedValueOnce(mockEmpty());            // PUT testcase
    vi.stubGlobal('fetch', mockFetch);

    await updateCase({
      key: 'PROJ-T42',
      objective: 'New objective',
      precondition: 'New precondition',
      labels: 'smoke,critical',
      priority: 'High',
    });

    const body = JSON.parse(mockFetch.mock.calls[2][1].body);
    expect(body.objective).toBe('New objective');
    expect(body.precondition).toBe('New precondition');
    expect(body.labels).toEqual(['smoke', 'critical']);
    expect(body.priority).toEqual({ id: 11 });
    expect(body.name).toBe('Original Name');
  });

  it('preserves existing objective and precondition when not provided', async () => {
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(mockOk(EXISTING_CASE))
      .mockResolvedValueOnce(mockEmpty());
    vi.stubGlobal('fetch', mockFetch);

    await updateCase({ key: 'PROJ-T42', name: 'New Name' });

    const body = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(body.objective).toBe('Original objective');
    expect(body.precondition).toBe('Original precondition');
  });
});