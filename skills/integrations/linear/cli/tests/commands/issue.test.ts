import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  searchIssues,
  getIssue,
  createIssue,
  updateIssue,
  documentUpsertIssue,
  commentIssue,
} from '../../src/commands/issue';
import { jsonFormatter } from '../../src/output';

vi.mock('../../src/graphql-client', () => ({
  query: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}));

import { query } from '../../src/graphql-client';
import { readFile } from 'node:fs/promises';

const mockedQuery = vi.mocked(query);
const mockedReadFile = vi.mocked(readFile);

describe('issue commands', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.clearAllMocks();
    // vi.clearAllMocks() does NOT drain mockResolvedValueOnce queues — only call history.
    // Reset the long-lived mocks explicitly so leaked-once values don't cascade between tests.
    mockedQuery.mockReset();
    mockedReadFile.mockReset();
  });

  describe('searchIssues', () => {
    it('uses searchIssues when query text is provided', async () => {
      mockedQuery.mockResolvedValue({
        searchIssues: { nodes: [{ id: '1', identifier: 'ENG-1', title: 'Bug' }] },
      });

      await searchIssues({ query: 'login bug' });

      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('searchIssues'),
        expect.objectContaining({ term: 'login bug', first: 50 })
      );
    });

    it('uses issues query when no text query provided', async () => {
      mockedQuery.mockResolvedValue({
        issues: { nodes: [] },
      });

      await searchIssues({});

      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('issues('),
        expect.objectContaining({ first: 50 })
      );
    });

    it('resolves team key to ID for filtering', async () => {
      // First call: resolve team
      mockedQuery.mockResolvedValueOnce({
        teams: { nodes: [{ id: 'team-uuid', key: 'ENG' }] },
      });
      // Second call: search issues
      mockedQuery.mockResolvedValueOnce({
        searchIssues: { nodes: [] },
      });

      await searchIssues({ query: 'test', team: 'ENG' });

      // Team resolution query
      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('FindTeam'),
        expect.objectContaining({ filter: { key: { eq: 'ENG' } } })
      );
    });

    it('respects custom limit', async () => {
      mockedQuery.mockResolvedValue({
        searchIssues: { nodes: [] },
      });

      await searchIssues({ query: 'test', limit: '10' });

      expect(mockedQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ first: 10 })
      );
    });

    it('applies state and label filters', async () => {
      mockedQuery.mockResolvedValue({
        issues: { nodes: [] },
      });

      await searchIssues({ state: 'In Progress', label: 'Bug' });

      const variables = mockedQuery.mock.calls[0][1] as Record<string, unknown>;
      const filter = variables.filter as Record<string, unknown>;
      expect(filter.state).toEqual({ name: { eqIgnoreCase: 'In Progress' } });
      expect(filter.labels).toEqual({ some: { name: { eqIgnoreCase: 'Bug' } } });
    });

    it('outputs compact issue list by default', async () => {
      const issues = [{
        id: '1',
        identifier: 'ENG-1',
        title: 'Bug',
        priority: 2,
        url: 'https://linear.app/issue/ENG-1',
        state: { id: 's1', name: 'Todo', type: 'unstarted' },
        team: { id: 't1', key: 'ENG', name: 'Engineering' },
        assignee: { id: 'u1', name: 'Alice', email: 'alice@example.com' },
        labels: { nodes: [{ id: 'l1', name: 'bug' }, { id: 'l2', name: 'qa' }] },
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      }];
      mockedQuery.mockResolvedValue({ searchIssues: { nodes: issues } });

      await searchIssues({ query: 'test' });

      expect(consoleSpy).toHaveBeenCalledWith(
        'ENG-1 | Todo | P2 | Bug | assignee:Alice | labels:bug,qa | url:https://linear.app/issue/ENG-1'
      );
    });

    it('outputs raw JSON when requested', async () => {
      const issues = [{ id: '1', identifier: 'ENG-1' }];
      mockedQuery.mockResolvedValue({ searchIssues: { nodes: issues } });

      await searchIssues({ query: 'test' }, jsonFormatter);

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(issues));
    });
  });

  describe('getIssue', () => {
    it('resolves identifier format (ENG-123) to UUID', async () => {
      // First call: resolve identifier
      mockedQuery.mockResolvedValueOnce({
        searchIssues: { nodes: [{ id: 'issue-uuid', identifier: 'ENG-123' }] },
      });
      // Second call: get issue details
      mockedQuery.mockResolvedValueOnce({
        issue: { id: 'issue-uuid', identifier: 'ENG-123', title: 'Bug' },
      });

      await getIssue('ENG-123');

      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('FindIssue'),
        expect.objectContaining({ term: 'ENG-123' })
      );
    });

    it('uses UUID directly when provided', async () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      mockedQuery.mockResolvedValue({
        issue: { id: uuid, identifier: 'ENG-123', title: 'Bug' },
      });

      await getIssue(uuid);

      // Should skip identifier resolution and go straight to issue query
      expect(mockedQuery).toHaveBeenCalledTimes(1);
      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('GetIssue'),
        expect.objectContaining({ id: uuid })
      );
    });

    it('includes relation data in JSON output', async () => {
      const issue = {
        id: 'issue-uuid',
        identifier: 'BUG-2',
        title: 'Blocked task',
        relations: {
          nodes: [
            {
              id: 'relation-uuid',
              type: 'blocks',
              issue: {
                id: 'blocker-uuid',
                identifier: 'BUG-1',
                title: 'Blocker task',
                state: { id: 'state-planned', name: 'Planned', type: 'unstarted' },
              },
              relatedIssue: {
                id: 'issue-uuid',
                identifier: 'BUG-2',
                title: 'Blocked task',
                state: { id: 'state-backlog', name: 'Backlog', type: 'backlog' },
              },
            },
          ],
        },
      };
      mockedQuery.mockResolvedValueOnce({
        searchIssues: { nodes: [{ id: 'issue-uuid', identifier: 'BUG-2' }] },
      });
      mockedQuery.mockResolvedValueOnce({ issue });

      await getIssue('BUG-2', jsonFormatter);

      const getCall = mockedQuery.mock.calls[1];
      expect(getCall[0]).toContain('relations(first: 50)');
      expect(getCall[0]).toContain('relatedIssue');
      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(issue));
    });

    it('throws on missing identifier', async () => {
      await expect(getIssue('')).rejects.toThrow('Issue identifier is required');
    });
  });

  describe('createIssue', () => {
    it('resolves team key and creates issue', async () => {
      // Resolve team
      mockedQuery.mockResolvedValueOnce({
        teams: { nodes: [{ id: 'team-uuid', key: 'ENG' }] },
      });
      // Create issue
      mockedQuery.mockResolvedValueOnce({
        issueCreate: {
          issue: { id: 'new-issue', identifier: 'ENG-456', title: 'New Bug' },
        },
      });

      await createIssue({ team: 'ENG', title: 'New Bug' });

      // Verify create mutation was called with teamId
      const createCall = mockedQuery.mock.calls[1];
      expect(createCall[0]).toContain('issueCreate');
      const input = (createCall[1] as Record<string, unknown>).input as Record<string, unknown>;
      expect(input.teamId).toBe('team-uuid');
      expect(input.title).toBe('New Bug');
    });

    it('throws when team is missing', async () => {
      await expect(createIssue({ team: '', title: 'Bug' })).rejects.toThrow(
        '--team is required'
      );
    });

    it('throws when title is missing', async () => {
      await expect(createIssue({ team: 'ENG', title: '' })).rejects.toThrow(
        '--title is required'
      );
    });

    it('includes optional fields when provided', async () => {
      // Resolve team
      mockedQuery.mockResolvedValueOnce({
        teams: { nodes: [{ id: 'team-uuid', key: 'ENG' }] },
      });
      // Resolve label
      mockedQuery.mockResolvedValueOnce({
        issueLabels: { nodes: [{ id: 'label-uuid', name: 'Bug' }] },
      });
      // Resolve state
      mockedQuery.mockResolvedValueOnce({
        workflowStates: { nodes: [{ id: 'state-uuid', name: 'Backlog' }] },
      });
      // Resolve project
      mockedQuery.mockResolvedValueOnce({
        projects: { nodes: [{ id: 'project-uuid', name: 'Sprint 1' }] },
      });
      // Create issue
      mockedQuery.mockResolvedValueOnce({
        issueCreate: {
          issue: { id: 'new-issue', identifier: 'ENG-456' },
        },
      });

      await createIssue({
        team: 'ENG',
        title: 'Bug',
        description: 'Steps...',
        priority: '2',
        label: 'Bug',
        state: 'Backlog',
        project: 'Sprint 1',
      });

      const createCall = mockedQuery.mock.calls[4]; // 5th call is createIssue
      const input = (createCall[1] as Record<string, unknown>).input as Record<string, unknown>;
      expect(input.description).toBe('Steps...');
      expect(input.priority).toBe(2);
      expect(input.labelIds).toEqual(['label-uuid']);
      expect(input.stateId).toBe('state-uuid');
      expect(input.projectId).toBe('project-uuid');
    });
  });

  describe('updateIssue', () => {
    it('throws on missing identifier', async () => {
      await expect(updateIssue('', {})).rejects.toThrow('Issue identifier is required');
    });

    it('throws when no update options provided', async () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      await expect(updateIssue(uuid, {})).rejects.toThrow('No update options provided');
    });

    it('resolves state name via issue team', async () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';

      // Get issue team
      mockedQuery.mockResolvedValueOnce({
        issue: { team: { id: 'team-uuid' } },
      });
      // Resolve state
      mockedQuery.mockResolvedValueOnce({
        workflowStates: { nodes: [{ id: 'state-uuid', name: 'Done' }] },
      });
      // Update issue
      mockedQuery.mockResolvedValueOnce({
        issueUpdate: { issue: { id: uuid, identifier: 'ENG-123' } },
      });

      await updateIssue(uuid, { state: 'Done' });

      const updateCall = mockedQuery.mock.calls[2];
      expect(updateCall[0]).toContain('issueUpdate');
      const input = (updateCall[1] as Record<string, unknown>).input as Record<string, unknown>;
      expect(input.stateId).toBe('state-uuid');
    });
  });

  describe('documentUpsertIssue', () => {
    const title = 'BUG-1 — Implementation Plan';

    it('creates a document when no exact title exists', async () => {
      mockedReadFile.mockResolvedValueOnce('# Visual plan');
      mockedQuery.mockResolvedValueOnce({
        searchIssues: { nodes: [{ id: 'issue-uuid', identifier: 'BUG-1' }] },
      });
      mockedQuery.mockResolvedValueOnce({
        issue: { id: 'issue-uuid', identifier: 'BUG-1', documents: { nodes: [] } },
      });
      mockedQuery.mockResolvedValueOnce({
        documentCreate: {
          document: { id: 'doc-1', title, url: 'https://linear.app/doc/doc-1' },
        },
      });

      await documentUpsertIssue('BUG-1', { title, contentFile: '/tmp/visual.md' });

      expect(mockedReadFile).toHaveBeenCalledWith('/tmp/visual.md', 'utf8');
      const createCall = mockedQuery.mock.calls.find((call) =>
        (call[0] as string).includes('documentCreate')
      );
      expect(createCall).toBeDefined();
      const input = (createCall![1] as Record<string, unknown>).input as Record<string, unknown>;
      expect(input).toEqual({ issueId: 'issue-uuid', title, content: '# Visual plan' });
      expect(consoleSpy).toHaveBeenCalledWith(
        'BUG-1 | document:BUG-1 — Implementation Plan | action:created | url:https://linear.app/doc/doc-1'
      );
    });

    it('updates the matching document by exact title', async () => {
      mockedReadFile.mockResolvedValueOnce('# Updated visual plan');
      mockedQuery.mockResolvedValueOnce({
        searchIssues: { nodes: [{ id: 'issue-uuid', identifier: 'BUG-1' }] },
      });
      mockedQuery.mockResolvedValueOnce({
        issue: {
          id: 'issue-uuid',
          identifier: 'BUG-1',
          documents: {
            nodes: [
              { id: 'doc-1', title, url: 'https://linear.app/doc/doc-1' },
              { id: 'doc-2', title: 'Other document', url: 'https://linear.app/doc/doc-2' },
            ],
          },
        },
      });
      mockedQuery.mockResolvedValueOnce({
        documentUpdate: {
          document: { id: 'doc-1', title, url: 'https://linear.app/doc/doc-1' },
        },
      });

      await documentUpsertIssue('BUG-1', { title, contentFile: '/tmp/visual.md' });

      const updateCall = mockedQuery.mock.calls.find((call) =>
        (call[0] as string).includes('documentUpdate')
      );
      expect(updateCall).toBeDefined();
      expect((updateCall![1] as Record<string, unknown>).id).toBe('doc-1');
      const input = (updateCall![1] as Record<string, unknown>).input as Record<string, unknown>;
      expect(input).toEqual({ title, content: '# Updated visual plan' });
      expect(consoleSpy).toHaveBeenCalledWith(
        'BUG-1 | document:BUG-1 — Implementation Plan | action:updated | url:https://linear.app/doc/doc-1'
      );
    });

    it('fails on duplicate exact-title documents', async () => {
      mockedReadFile.mockResolvedValueOnce('# Visual plan');
      mockedQuery.mockResolvedValueOnce({
        searchIssues: { nodes: [{ id: 'issue-uuid', identifier: 'BUG-1' }] },
      });
      mockedQuery.mockResolvedValueOnce({
        issue: {
          id: 'issue-uuid',
          identifier: 'BUG-1',
          documents: { nodes: [{ id: 'doc-1', title }, { id: 'doc-2', title }] },
        },
      });

      await expect(
        documentUpsertIssue('BUG-1', { title, contentFile: '/tmp/visual.md' })
      ).rejects.toThrow('Found 2 documents titled');
      expect(mockedQuery.mock.calls.some((call) =>
        (call[0] as string).includes('documentCreate') || (call[0] as string).includes('documentUpdate')
      )).toBe(false);
    });

    it('fails when the content file cannot be read', async () => {
      mockedReadFile.mockRejectedValueOnce(new Error('ENOENT: no such file'));

      await expect(
        documentUpsertIssue('BUG-1', { title, contentFile: '/tmp/missing.md' })
      ).rejects.toThrow('ENOENT');
      expect(mockedQuery).not.toHaveBeenCalled();
    });

    it('outputs raw JSON when requested', async () => {
      mockedReadFile.mockResolvedValueOnce('# Visual plan');
      mockedQuery.mockResolvedValueOnce({
        searchIssues: { nodes: [{ id: 'issue-uuid', identifier: 'BUG-1' }] },
      });
      mockedQuery.mockResolvedValueOnce({
        issue: { id: 'issue-uuid', identifier: 'BUG-1', documents: { nodes: [] } },
      });
      mockedQuery.mockResolvedValueOnce({
        documentCreate: {
          document: { id: 'doc-1', title, url: 'https://linear.app/doc/doc-1' },
        },
      });

      await documentUpsertIssue('BUG-1', { title, contentFile: '/tmp/visual.md' }, jsonFormatter);

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify({
        identifier: 'BUG-1',
        action: 'created',
        documentTitle: title,
        documentUrl: 'https://linear.app/doc/doc-1',
        document: { id: 'doc-1', title, url: 'https://linear.app/doc/doc-1' },
      }));
    });
  });

  describe('commentIssue', () => {
    it('throws on missing identifier', async () => {
      await expect(commentIssue('', 'body')).rejects.toThrow('Issue identifier is required');
    });

    it('throws on missing body', async () => {
      await expect(commentIssue('ENG-123', '')).rejects.toThrow('--body is required');
    });

    it('creates comment with resolved issue ID (string body signature)', async () => {
      mockedQuery.mockResolvedValueOnce({
        searchIssues: { nodes: [{ id: 'issue-uuid', identifier: 'ENG-123' }] },
      });
      mockedQuery.mockResolvedValueOnce({
        commentCreate: {
          comment: { id: 'comment-1', body: 'Test evidence', createdAt: '2026-01-01' },
        },
      });

      await commentIssue('ENG-123', 'Test evidence');

      const commentCall = mockedQuery.mock.calls[1];
      expect(commentCall[0]).toContain('commentCreate');
      const input = (commentCall[1] as Record<string, unknown>).input as Record<string, unknown>;
      expect(input.issueId).toBe('issue-uuid');
      expect(input.body).toBe('Test evidence');
    });

    it('accepts new { body } options shape', async () => {
      mockedQuery.mockResolvedValueOnce({
        searchIssues: { nodes: [{ id: 'issue-uuid', identifier: 'ENG-123' }] },
      });
      mockedQuery.mockResolvedValueOnce({
        commentCreate: {
          comment: { id: 'comment-1', body: 'B', createdAt: '2026-01-01' },
        },
      });

      await commentIssue('ENG-123', { body: 'B' });

      const input = (mockedQuery.mock.calls[1][1] as Record<string, unknown>).input as Record<string, unknown>;
      expect(input.body).toBe('B');
    });

    it('reads body from --body-file', async () => {
      mockedReadFile.mockResolvedValueOnce('body from file');
      mockedQuery.mockResolvedValueOnce({
        searchIssues: { nodes: [{ id: 'issue-uuid', identifier: 'ENG-123' }] },
      });
      mockedQuery.mockResolvedValueOnce({
        commentCreate: {
          comment: { id: 'comment-1', body: 'body from file', createdAt: '2026-01-01' },
        },
      });

      await commentIssue('ENG-123', { bodyFile: '/tmp/c.md' });

      expect(mockedReadFile).toHaveBeenCalledWith('/tmp/c.md', 'utf8');
      const input = (mockedQuery.mock.calls[1][1] as Record<string, unknown>).input as Record<string, unknown>;
      expect(input.body).toBe('body from file');
    });

    it('rejects --body AND --body-file together', async () => {
      await expect(
        commentIssue('ENG-123', { body: 'inline', bodyFile: '/tmp/c.md' })
      ).rejects.toThrow(/Cannot pass both --body and --body-file/);
    });
  });

  // ─── Phase A1: generic primitives ───────────────────────────────────────────

  describe('searchIssues — repeated --label', () => {
    it('single label uses some{} filter', async () => {
      mockedQuery.mockResolvedValue({ issues: { nodes: [] } });

      await searchIssues({ labels: ['feature'] });

      const filter = (mockedQuery.mock.calls[0][1] as Record<string, unknown>).filter as Record<string, unknown>;
      expect(filter.labels).toEqual({ some: { name: { eqIgnoreCase: 'feature' } } });
      expect(filter.and).toBeUndefined();
    });

    it('multiple labels build an AND of per-label some{} clauses', async () => {
      mockedQuery.mockResolvedValue({ issues: { nodes: [] } });

      await searchIssues({ labels: ['feature', 'retention', 'false'] });

      const filter = (mockedQuery.mock.calls[0][1] as Record<string, unknown>).filter as Record<string, unknown>;
      expect(filter.labels).toBeUndefined();
      expect(filter.and).toEqual([
        { labels: { some: { name: { eqIgnoreCase: 'feature' } } } },
        { labels: { some: { name: { eqIgnoreCase: 'retention' } } } },
        { labels: { some: { name: { eqIgnoreCase: 'false' } } } },
      ]);
    });

    it('backward-compat: single string label still works', async () => {
      mockedQuery.mockResolvedValue({ issues: { nodes: [] } });

      await searchIssues({ label: 'Bug' });

      const filter = (mockedQuery.mock.calls[0][1] as Record<string, unknown>).filter as Record<string, unknown>;
      expect(filter.labels).toEqual({ some: { name: { eqIgnoreCase: 'Bug' } } });
    });
  });

  describe('createIssue — repeated --label & file input', () => {
    it('deduplicates repeated label names (case-insensitive) before resolving', async () => {
      // Two unique names ('Bug', 'qa') after dedup — repeated 'Bug' should NOT trigger a third call.
      mockedQuery.mockResolvedValueOnce({
        teams: { nodes: [{ id: 'team-uuid', key: 'ENG' }] },
      });
      mockedQuery.mockResolvedValueOnce({
        issueLabels: { nodes: [{ id: 'label-bug', name: 'Bug' }] },
      });
      mockedQuery.mockResolvedValueOnce({
        issueLabels: { nodes: [{ id: 'label-qa', name: 'qa' }] },
      });
      mockedQuery.mockResolvedValueOnce({
        issueCreate: { issue: { id: 'new', identifier: 'ENG-1' } },
      });

      await createIssue({
        team: 'ENG',
        title: 'multi label smoke',
        labels: ['Bug', 'qa', 'Bug'],
      });

      // Count actual label resolution calls.
      const labelCalls = mockedQuery.mock.calls.filter((call) =>
        (call[0] as string).includes('FindLabel')
      );
      expect(labelCalls).toHaveLength(2);

      const createCall = mockedQuery.mock.calls.find((call) =>
        (call[0] as string).includes('issueCreate')
      );
      expect(createCall).toBeDefined();
      const input = (createCall![1] as Record<string, unknown>).input as Record<string, unknown>;
      expect(input.labelIds).toEqual(['label-bug', 'label-qa']);
    });

    it('reads description from --description-file', async () => {
      mockedReadFile.mockResolvedValueOnce('# Description from file');
      mockedQuery.mockResolvedValueOnce({
        teams: { nodes: [{ id: 'team-uuid', key: 'ENG' }] },
      });
      mockedQuery.mockResolvedValueOnce({
        issueCreate: { issue: { id: 'new', identifier: 'ENG-1' } },
      });

      await createIssue({
        team: 'ENG',
        title: 'file desc',
        descriptionFile: '/tmp/d.md',
      });

      expect(mockedReadFile).toHaveBeenCalledWith('/tmp/d.md', 'utf8');
      const createCall = mockedQuery.mock.calls.find((call) =>
        (call[0] as string).includes('issueCreate')
      );
      const input = (createCall![1] as Record<string, unknown>).input as Record<string, unknown>;
      expect(input.description).toBe('# Description from file');
    });

    it('rejects --description AND --description-file together', async () => {
      mockedQuery.mockResolvedValueOnce({
        teams: { nodes: [{ id: 'team-uuid', key: 'ENG' }] },
      });
      await expect(
        createIssue({
          team: 'ENG',
          title: 't',
          description: 'inline',
          descriptionFile: '/tmp/d.md',
        })
      ).rejects.toThrow(/Cannot pass both --description and --description-file/);
    });
  });

  // ─── Phase A2: generic priority and project handling ──────────────────────

  describe('createIssue — generic priority and project handling', () => {
    it('--priority 2 passes through as 2', async () => {
      mockedQuery.mockResolvedValueOnce({
        teams: { nodes: [{ id: 'team-uuid', key: 'ENG' }] },
      });
      mockedQuery.mockResolvedValueOnce({
        issueCreate: { issue: { id: 'new', identifier: 'ENG-1' } },
      });

      await createIssue({ team: 'ENG', title: 't', priority: '2' });

      const createCall = mockedQuery.mock.calls.find((call) =>
        (call[0] as string).includes('issueCreate')
      );
      const input = (createCall![1] as Record<string, unknown>).input as Record<string, unknown>;
      expect(input.priority).toBe(2);
    });

    it('--priority 0 passes through as 0', async () => {
      mockedQuery.mockResolvedValueOnce({
        teams: { nodes: [{ id: 'team-uuid', key: 'ENG' }] },
      });
      mockedQuery.mockResolvedValueOnce({
        issueCreate: { issue: { id: 'new', identifier: 'ENG-1' } },
      });

      await createIssue({ team: 'ENG', title: 't', priority: '0' });

      const createCall = mockedQuery.mock.calls.find((call) =>
        (call[0] as string).includes('issueCreate')
      );
      const input = (createCall![1] as Record<string, unknown>).input as Record<string, unknown>;
      expect(input.priority).toBe(0);
    });

    it('rejects non-native --priority values', async () => {
      mockedQuery.mockResolvedValueOnce({
        teams: { nodes: [{ id: 'team-uuid', key: 'ENG' }] },
      });
      await expect(
        createIssue({ team: 'ENG', title: 't', priority: 'urgent' })
      ).rejects.toThrow(/Linear-native value from 0 to 4/);
    });

    it('--project resolves to project id', async () => {
      mockedQuery.mockResolvedValueOnce({
        teams: { nodes: [{ id: 'team-uuid', key: 'ENG' }] },
      });
      mockedQuery.mockResolvedValueOnce({
        projects: { nodes: [{ id: 'project-infra', name: 'infra' }] },
      });
      mockedQuery.mockResolvedValueOnce({
        issueCreate: { issue: { id: 'new', identifier: 'ENG-1' } },
      });

      await createIssue({ team: 'ENG', title: 't', project: 'infra' });

      const createCall = mockedQuery.mock.calls.find((call) =>
        (call[0] as string).includes('issueCreate')
      );
      const input = (createCall![1] as Record<string, unknown>).input as Record<string, unknown>;
      expect(input.projectId).toBe('project-infra');
    });

    it('throws when --project cannot be resolved', async () => {
      mockedQuery.mockResolvedValueOnce({
        teams: { nodes: [{ id: 'team-uuid', key: 'ENG' }] },
      });
      mockedQuery.mockResolvedValueOnce({
        projects: { nodes: [] },
      });

      await expect(
        createIssue({ team: 'ENG', title: 't', project: 'missing' })
      ).rejects.toThrow('Project "missing" not found');
    });
  });
});
