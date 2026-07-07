import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ensureCycle } from '../../src/commands/ensure-cycle';
import { mockOk } from '../mock-response';

describe('ensure-cycle', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, ZEPHYR_API_TOKEN: 'test-token' };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('requires a caller-supplied Jira project version ID', async () => {
    await expect(ensureCycle({
      project: 'PROJ', name: 'Run 1', jiraProjectVersionId: '', plannedStartDate: '2026-07-06', plannedEndDate: '2026-07-06',
    })).rejects.toThrow('--jira-project-version-id is required');
  });

  it('reuses an existing cycle scoped to the Jira project version', async () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const existing = { id: 3, key: 'PROJ-R3', name: 'Run 1', project: { id: 1, key: 'PROJ' } };
    const mockFetch = vi.fn().mockResolvedValue(
      mockOk({ values: [existing], total: 1, startAt: 0, maxResults: 100, isLast: true })
    );
    vi.stubGlobal('fetch', mockFetch);

    await ensureCycle({
      project: 'PROJ',
      name: 'Run 1',
      jiraProjectVersionId: '10001',
      plannedStartDate: '2026-07-06',
      plannedEndDate: '2026-07-07',
    });

    const listUrl = mockFetch.mock.calls[0][0] as string;
    expect(listUrl).toContain('jiraProjectVersionId=10001');
    expect(JSON.parse(writeSpy.mock.calls[0][0] as string)).toEqual({ created: false, cycle: existing });
  });

  it('creates a release-linked cycle with jiraProjectVersionId', async () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(mockOk({ values: [], total: 0, startAt: 0, maxResults: 100, isLast: true }))
      .mockResolvedValueOnce(mockOk({ id: 4, key: 'PROJ-R4' }));
    vi.stubGlobal('fetch', mockFetch);

    await ensureCycle({
      project: 'PROJ',
      name: 'Run 1',
      jiraProjectVersionId: '10001',
      plannedStartDate: '2026-07-06',
      plannedEndDate: '2026-07-07',
      description: 'Release run',
      status: 'In Progress',
    });

    const body = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(body).toEqual({
      projectKey: 'PROJ',
      name: 'Run 1',
      jiraProjectVersionId: 10001,
      plannedStartDate: '2026-07-06',
      plannedEndDate: '2026-07-07',
      description: 'Release run',
      statusName: 'In Progress',
    });
    expect(JSON.parse(writeSpy.mock.calls[0][0] as string).created).toBe(true);
  });
});
