import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listLabels } from '../../src/commands/label';
import { jsonFormatter } from '../../src/output';

vi.mock('../../src/graphql-client', () => ({
  query: vi.fn(),
}));

import { query } from '../../src/graphql-client';

const mockedQuery = vi.mocked(query);

describe('label commands', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.clearAllMocks();
  });

  describe('listLabels', () => {
    it('queries all labels when no team filter', async () => {
      const labels = [
        { id: 'l1', name: 'Bug', color: '#ff0000' },
        { id: 'l2', name: 'Feature', color: '#00ff00' },
      ];
      mockedQuery.mockResolvedValue({ issueLabels: { nodes: labels } });

      await listLabels();

      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('ListLabels'),
        expect.objectContaining({ filter: undefined })
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        'Bug | color:#ff0000 | id:l1\nFeature | color:#00ff00 | id:l2'
      );
    });

    it('outputs raw JSON when requested', async () => {
      const labels = [{ id: 'l1', name: 'Bug', color: '#ff0000' }];
      mockedQuery.mockResolvedValue({ issueLabels: { nodes: labels } });

      await listLabels(undefined, jsonFormatter);

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(labels));
    });

    it('resolves team key and filters labels by team', async () => {
      // Resolve team
      mockedQuery.mockResolvedValueOnce({
        teams: { nodes: [{ id: 'team-uuid', key: 'ENG' }] },
      });
      // List labels
      mockedQuery.mockResolvedValueOnce({
        issueLabels: { nodes: [{ id: 'l1', name: 'Bug', color: '#ff0000' }] },
      });

      await listLabels('ENG');

      // Verify team filter was applied
      const labelCall = mockedQuery.mock.calls[1];
      const variables = labelCall[1] as Record<string, unknown>;
      const filter = variables.filter as Record<string, unknown>;
      expect(filter.team).toEqual({ id: { eq: 'team-uuid' } });
    });
  });
});
