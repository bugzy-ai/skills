import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { listProjects } from '../../src/commands/team';

const ENV_BACKUP = { ...process.env };
const mockFetchFn = vi.fn();

beforeEach(() => {
  process.env.FIGMA_ACCESS_TOKEN = 'test-token-123';
  delete process.env.FIGMA_TEAM_ID;
  mockFetchFn.mockReset();
  vi.stubGlobal('fetch', mockFetchFn);
});

afterEach(() => {
  process.env = { ...ENV_BACKUP };
  vi.restoreAllMocks();
});

function mockResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(data)),
    json: () => Promise.resolve(data),
    headers: new Headers(),
  } as Response;
}

describe('listProjects', () => {
  it('lists projects for a team', async () => {
    mockFetchFn.mockResolvedValue(mockResponse({
      projects: [
        { id: '111', name: 'Design System' },
        { id: '222', name: 'Marketing' },
      ],
    }));

    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await listProjects('team-123');

    const output = JSON.parse(spy.mock.calls[0][0]);
    expect(output).toEqual([
      { id: '111', name: 'Design System' },
      { id: '222', name: 'Marketing' },
    ]);
    expect(mockFetchFn.mock.calls[0][0]).toContain('/v1/teams/team-123/projects');
    spy.mockRestore();
  });

  it('falls back to FIGMA_TEAM_ID env var', async () => {
    process.env.FIGMA_TEAM_ID = 'env-team-456';
    mockFetchFn.mockResolvedValue(mockResponse({ projects: [] }));

    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await listProjects('');

    expect(mockFetchFn.mock.calls[0][0]).toContain('/v1/teams/env-team-456/projects');
    spy.mockRestore();
  });

  it('prefers explicit team ID over env var', async () => {
    process.env.FIGMA_TEAM_ID = 'env-team-456';
    mockFetchFn.mockResolvedValue(mockResponse({ projects: [] }));

    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await listProjects('explicit-789');

    expect(mockFetchFn.mock.calls[0][0]).toContain('/v1/teams/explicit-789/projects');
    spy.mockRestore();
  });

  it('throws if no team ID provided and no env var', async () => {
    await expect(listProjects('')).rejects.toThrow('Team ID is required');
  });

  it('handles empty projects list', async () => {
    mockFetchFn.mockResolvedValue(mockResponse({ projects: [] }));

    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await listProjects('team-123');

    expect(JSON.parse(spy.mock.calls[0][0])).toEqual([]);
    spy.mockRestore();
  });
});
