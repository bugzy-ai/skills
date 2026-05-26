import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listTeams } from '../../src/commands/team';
import { jsonFormatter } from '../../src/output';

vi.mock('../../src/graphql-client', () => ({
  query: vi.fn(),
}));

import { query } from '../../src/graphql-client';

const mockedQuery = vi.mocked(query);

describe('team commands', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.clearAllMocks();
  });

  describe('listTeams', () => {
    it('queries teams and outputs compact text', async () => {
      const teams = [
        { id: '1', key: 'ENG', name: 'Engineering' },
        { id: '2', key: 'DES', name: 'Design' },
      ];
      mockedQuery.mockResolvedValue({ teams: { nodes: teams } });

      await listTeams();

      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('ListTeams')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        'ENG | Engineering | id:1\nDES | Design | id:2'
      );
    });

    it('outputs no results when no teams', async () => {
      mockedQuery.mockResolvedValue({ teams: { nodes: [] } });

      await listTeams();

      expect(consoleSpy).toHaveBeenCalledWith('no results');
    });

    it('outputs raw JSON when requested', async () => {
      const teams = [{ id: '1', key: 'ENG', name: 'Engineering' }];
      mockedQuery.mockResolvedValue({ teams: { nodes: teams } });

      await listTeams(jsonFormatter);

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(teams));
    });
  });
});
