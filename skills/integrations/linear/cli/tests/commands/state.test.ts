import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listStates } from '../../src/commands/state';
import { jsonFormatter } from '../../src/output';

vi.mock('../../src/graphql-client', () => ({
  query: vi.fn(),
}));

import { query } from '../../src/graphql-client';

const mockedQuery = vi.mocked(query);

describe('state commands', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.clearAllMocks();
  });

  describe('listStates', () => {
    it('throws when team is missing', async () => {
      await expect(listStates('')).rejects.toThrow('--team is required');
    });

    it('outputs raw JSON when requested', async () => {
      mockedQuery.mockResolvedValueOnce({
        teams: { nodes: [{ id: 'team-uuid', key: 'ENG' }] },
      });
      const states = [{ id: 's1', name: 'Backlog', type: 'backlog', position: 0 }];
      mockedQuery.mockResolvedValueOnce({
        workflowStates: { nodes: states },
      });

      await listStates('ENG', jsonFormatter);

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(states));
    });

    it('resolves team key and queries workflow states', async () => {
      // Resolve team
      mockedQuery.mockResolvedValueOnce({
        teams: { nodes: [{ id: 'team-uuid', key: 'ENG' }] },
      });
      // List states
      const states = [
        { id: 's1', name: 'Backlog', type: 'backlog', position: 0 },
        { id: 's2', name: 'In Progress', type: 'started', position: 1 },
        { id: 's3', name: 'Done', type: 'completed', position: 2 },
      ];
      mockedQuery.mockResolvedValueOnce({
        workflowStates: { nodes: states },
      });

      await listStates('ENG');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Backlog | type:backlog | position:0 | id:s1\nIn Progress | type:started | position:1 | id:s2\nDone | type:completed | position:2 | id:s3'
      );
    });
  });
});
