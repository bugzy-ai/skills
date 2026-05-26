import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getProject, listProjects } from '../../src/commands/project';
import { jsonFormatter } from '../../src/output';

vi.mock('../../src/graphql-client', () => ({
  query: vi.fn(),
}));

import { query } from '../../src/graphql-client';

const mockedQuery = vi.mocked(query);

const baseProject = {
  id: '1',
  name: 'Sprint 1',
  state: 'started',
  teams: { nodes: [{ id: 't1' }] },
};

describe('project commands', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.clearAllMocks();
  });

  describe('listProjects', () => {
    it('queries all projects when no team filter', async () => {
      mockedQuery.mockResolvedValue({ projects: { nodes: [baseProject] } });

      await listProjects();

      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('ListProjects'),
        expect.objectContaining({ filter: undefined })
      );

      expect(consoleSpy).toHaveBeenCalledWith('Sprint 1 | state:started | teams:t1');
    });

    it('outputs raw JSON when requested', async () => {
      mockedQuery.mockResolvedValue({ projects: { nodes: [baseProject] } });

      await listProjects(undefined, jsonFormatter);

      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify([{ id: '1', name: 'Sprint 1', state: 'started', teamIds: ['t1'] }])
      );
    });

    it('includes project metadata in JSON output', async () => {
      mockedQuery.mockResolvedValue({
        projects: {
          nodes: [{
            ...baseProject,
            description: 'Short description',
            content: '# Content',
            priority: 2,
            status: { id: 'status-1', name: 'Backlog', type: 'backlog' },
          }],
        },
      });

      await listProjects(undefined, jsonFormatter);

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify([{
        id: '1',
        name: 'Sprint 1',
        description: 'Short description',
        content: '# Content',
        priority: 2,
        state: 'started',
        status: { id: 'status-1', name: 'Backlog', type: 'backlog' },
        teamIds: ['t1'],
      }]));
    });

    it('resolves team key and filters by team', async () => {
      mockedQuery.mockResolvedValueOnce({
        teams: { nodes: [{ id: 'team-uuid', key: 'ENG' }] },
      });
      mockedQuery.mockResolvedValueOnce({
        projects: { nodes: [] },
      });

      await listProjects('ENG');

      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('FindTeam'),
        expect.objectContaining({ filter: { key: { eq: 'ENG' } } })
      );
    });

    it('throws when team key not found', async () => {
      mockedQuery.mockResolvedValue({
        teams: { nodes: [] },
      });

      await expect(listProjects('NONEXISTENT')).rejects.toThrow(
        'Team with key "NONEXISTENT" not found'
      );
    });
  });

  describe('getProject', () => {
    it('gets a project by exact name', async () => {
      mockedQuery.mockResolvedValue({ projects: { nodes: [baseProject] } });

      await getProject('Sprint 1');

      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('FindProject'),
        expect.objectContaining({ filter: { name: { eqIgnoreCase: 'Sprint 1' } } })
      );
      expect(consoleSpy).toHaveBeenCalledWith('Sprint 1\nid:1\nstate:started\nteams:t1');
    });

    it('gets a project by UUID', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';
      mockedQuery.mockResolvedValue({ project: baseProject });

      await getProject(id, jsonFormatter);

      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('GetProject'),
        expect.objectContaining({ id })
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify({ id: '1', name: 'Sprint 1', state: 'started', teamIds: ['t1'] })
      );
    });

    it('throws when project is missing', async () => {
      mockedQuery.mockResolvedValue({ projects: { nodes: [] } });

      await expect(getProject('missing')).rejects.toThrow('Project "missing" not found');
    });

    it('throws when a project name is duplicated', async () => {
      mockedQuery.mockResolvedValue({ projects: { nodes: [baseProject, { ...baseProject, id: '2' }] } });

      await expect(getProject('Sprint 1')).rejects.toThrow('Multiple projects named "Sprint 1" found');
    });
  });
});
