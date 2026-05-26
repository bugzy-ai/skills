import { describe, it, expect, vi, beforeEach } from 'vitest';
import { relateIssue } from '../../src/commands/issue';

vi.mock('../../src/graphql-client', () => ({
  query: vi.fn(),
}));

import { query } from '../../src/graphql-client';

const mockedQuery = vi.mocked(query);

describe('relateIssue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('rejects missing identifier', async () => {
    await expect(relateIssue('', { blocks: 'ENG-2' })).rejects.toThrow('Issue identifier is required');
  });

  it('rejects when neither --blocks nor --related is set', async () => {
    await expect(relateIssue('ENG-1', {})).rejects.toThrow('--blocks <id> or --related <id> is required');
  });

  it('rejects --blocks AND --related together', async () => {
    await expect(
      relateIssue('ENG-1', { blocks: 'ENG-2', related: 'ENG-3' }),
    ).rejects.toThrow('Pass either --blocks or --related');
  });

  it('creates a blocks relation', async () => {
    // resolveIssueId(ENG-1)
    mockedQuery.mockResolvedValueOnce({
      searchIssues: { nodes: [{ id: 'uuid-1', identifier: 'ENG-1' }] },
    });
    // resolveIssueId(ENG-2)
    mockedQuery.mockResolvedValueOnce({
      searchIssues: { nodes: [{ id: 'uuid-2', identifier: 'ENG-2' }] },
    });
    // mutation
    mockedQuery.mockResolvedValueOnce({
      issueRelationCreate: {
        issueRelation: {
          id: 'rel-1',
          type: 'blocks',
          issue: { id: 'uuid-1', identifier: 'ENG-1' },
          relatedIssue: { id: 'uuid-2', identifier: 'ENG-2' },
        },
      },
    });

    await relateIssue('ENG-1', { blocks: 'ENG-2' });

    const mutationCall = mockedQuery.mock.calls.find((c) =>
      (c[0] as string).includes('issueRelationCreate'),
    );
    expect(mutationCall).toBeDefined();
    const input = (mutationCall![1] as Record<string, unknown>).input as Record<string, unknown>;
    expect(input.issueId).toBe('uuid-1');
    expect(input.relatedIssueId).toBe('uuid-2');
    expect(input.type).toBe('blocks');
  });

  it('creates a related relation', async () => {
    mockedQuery.mockResolvedValueOnce({
      searchIssues: { nodes: [{ id: 'uuid-1', identifier: 'ENG-1' }] },
    });
    mockedQuery.mockResolvedValueOnce({
      searchIssues: { nodes: [{ id: 'uuid-2', identifier: 'ENG-2' }] },
    });
    mockedQuery.mockResolvedValueOnce({
      issueRelationCreate: {
        issueRelation: {
          id: 'rel-1',
          type: 'related',
          issue: { id: 'uuid-1', identifier: 'ENG-1' },
          relatedIssue: { id: 'uuid-2', identifier: 'ENG-2' },
        },
      },
    });

    await relateIssue('ENG-1', { related: 'ENG-2' });

    const mutationCall = mockedQuery.mock.calls.find((c) =>
      (c[0] as string).includes('issueRelationCreate'),
    );
    const input = (mutationCall![1] as Record<string, unknown>).input as Record<string, unknown>;
    expect(input.type).toBe('related');
  });

  it('accepts UUID identifiers directly', async () => {
    const issueUuid = '550e8400-e29b-41d4-a716-446655440000';
    const relatedUuid = '550e8400-e29b-41d4-a716-446655440001';

    mockedQuery.mockResolvedValueOnce({
      issueRelationCreate: {
        issueRelation: {
          id: 'rel-1',
          type: 'blocks',
          issue: { id: issueUuid, identifier: 'ENG-1' },
          relatedIssue: { id: relatedUuid, identifier: 'ENG-2' },
        },
      },
    });

    await relateIssue(issueUuid, { blocks: relatedUuid });

    // Should NOT have called the identifier-resolution queries — UUIDs short-circuit.
    expect(mockedQuery).toHaveBeenCalledTimes(1);
    const input = (mockedQuery.mock.calls[0][1] as Record<string, unknown>).input as Record<string, unknown>;
    expect(input.issueId).toBe(issueUuid);
    expect(input.relatedIssueId).toBe(relatedUuid);
  });
});
