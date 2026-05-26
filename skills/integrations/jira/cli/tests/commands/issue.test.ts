import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/jira-client', () => ({
  request: vi.fn(),
  textToAdf: vi.fn((text: string) => ({
    version: 1,
    type: 'doc',
    content: text.split('\n').map((line: string) => ({
      type: 'paragraph',
      content: line ? [{ type: 'text', text: line }] : [],
    })),
  })),
}));

import { request } from '../../src/jira-client';
import {
  searchIssues,
  getIssue,
  createIssue,
  updateIssue,
  commentIssue,
  transitionIssue,
} from '../../src/commands/issue';

const mockedRequest = vi.mocked(request);

describe('issue commands', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('searchIssues', () => {
    it('sends JQL query with defaults', async () => {
      mockedRequest.mockResolvedValue({ issues: [], total: 0 });

      await searchIssues({ jql: 'project = PROJ' });

      expect(mockedRequest).toHaveBeenCalledWith(
        'GET',
        expect.stringContaining('/search/jql?')
      );
      const url = mockedRequest.mock.calls[0][1];
      expect(url).toContain('jql=project+%3D+PROJ');
      expect(url).toContain('maxResults=50');
      expect(url).toContain('startAt=0');
    });

    it('respects custom fields, limit, and startAt', async () => {
      mockedRequest.mockResolvedValue({ issues: [], total: 0 });

      await searchIssues({
        jql: 'status = Open',
        fields: 'summary,status',
        limit: '10',
        startAt: '20',
      });

      const url = mockedRequest.mock.calls[0][1];
      expect(url).toContain('fields=summary%2Cstatus');
      expect(url).toContain('maxResults=10');
      expect(url).toContain('startAt=20');
    });

    it('caps limit at 100', async () => {
      mockedRequest.mockResolvedValue({ issues: [], total: 0 });

      await searchIssues({ jql: 'project = X', limit: '200' });

      const url = mockedRequest.mock.calls[0][1];
      expect(url).toContain('maxResults=100');
    });

    it('outputs JSON to stdout', async () => {
      mockedRequest.mockResolvedValue({ issues: [{ key: 'PROJ-1' }], total: 1 });

      await searchIssues({ jql: 'project = PROJ' });

      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify({ issues: [{ key: 'PROJ-1' }], total: 1 })
      );
    });

    it('throws when jql is empty', async () => {
      await expect(searchIssues({ jql: '' })).rejects.toThrow('--jql is required');
    });
  });

  describe('getIssue', () => {
    it('fetches issue by key', async () => {
      mockedRequest.mockResolvedValue({ key: 'PROJ-42' });

      await getIssue('PROJ-42');

      expect(mockedRequest).toHaveBeenCalledWith('GET', '/issue/PROJ-42');
    });

    it('passes fields and expand params', async () => {
      mockedRequest.mockResolvedValue({ key: 'PROJ-42' });

      await getIssue('PROJ-42', { fields: 'summary', expand: 'transitions' });

      expect(mockedRequest).toHaveBeenCalledWith(
        'GET',
        '/issue/PROJ-42?fields=summary&expand=transitions'
      );
    });

    it('throws when key is missing', async () => {
      await expect(getIssue('')).rejects.toThrow('Issue key is required');
    });
  });

  describe('createIssue', () => {
    it('creates issue with required fields', async () => {
      mockedRequest.mockResolvedValue({ key: 'PROJ-100', id: '10100' });

      await createIssue({
        project: 'PROJ',
        type: 'Bug',
        summary: 'Login fails',
      });

      expect(mockedRequest).toHaveBeenCalledWith('POST', '/issue', {
        fields: {
          project: { key: 'PROJ' },
          issuetype: { name: 'Bug' },
          summary: 'Login fails',
        },
      });
    });

    it('includes optional fields', async () => {
      mockedRequest.mockResolvedValue({ key: 'PROJ-100' });

      await createIssue({
        project: 'PROJ',
        type: 'Bug',
        summary: 'Test',
        description: 'Steps to reproduce',
        priority: 'High',
        assignee: 'abc-123',
        labels: ['bug', 'cart'],
        components: ['Auth'],
      });

      const body = mockedRequest.mock.calls[0][2] as { fields: Record<string, unknown> };
      expect(body.fields.priority).toEqual({ name: 'High' });
      expect(body.fields.assignee).toEqual({ accountId: 'abc-123' });
      expect(body.fields.labels).toEqual(['bug', 'cart']);
      expect(body.fields.components).toEqual([{ name: 'Auth' }]);
      expect(body.fields.description).toBeDefined();
    });

    it('throws when project is missing', async () => {
      await expect(
        createIssue({ project: '', type: 'Bug', summary: 'Test' })
      ).rejects.toThrow('--project is required');
    });

    it('throws when type is missing', async () => {
      await expect(
        createIssue({ project: 'PROJ', type: '', summary: 'Test' })
      ).rejects.toThrow('--type is required');
    });

    it('throws when summary is missing', async () => {
      await expect(
        createIssue({ project: 'PROJ', type: 'Bug', summary: '' })
      ).rejects.toThrow('--summary is required');
    });
  });

  describe('updateIssue', () => {
    it('updates summary', async () => {
      mockedRequest.mockResolvedValue({});

      await updateIssue('PROJ-42', { summary: 'New title' });

      expect(mockedRequest).toHaveBeenCalledWith('PUT', '/issue/PROJ-42', {
        fields: { summary: 'New title' },
      });
    });

    it('updates assignee', async () => {
      mockedRequest.mockResolvedValue({});

      await updateIssue('PROJ-42', { assignee: 'abc-123' });

      expect(mockedRequest).toHaveBeenCalledWith('PUT', '/issue/PROJ-42', {
        fields: { assignee: { accountId: 'abc-123' } },
      });
    });

    it('throws when no update options provided', async () => {
      await expect(updateIssue('PROJ-42', {})).rejects.toThrow('No update options provided');
    });

    it('throws when key is missing', async () => {
      await expect(updateIssue('', { summary: 'Test' })).rejects.toThrow(
        'Issue key is required'
      );
    });
  });

  describe('commentIssue', () => {
    it('adds comment with body converted to ADF', async () => {
      mockedRequest.mockResolvedValue({ id: '10001' });

      await commentIssue('PROJ-42', 'Test comment');

      expect(mockedRequest).toHaveBeenCalledWith(
        'POST',
        '/issue/PROJ-42/comment',
        expect.objectContaining({
          body: expect.objectContaining({ type: 'doc' }),
        })
      );
    });

    it('includes visibility restriction', async () => {
      mockedRequest.mockResolvedValue({ id: '10001' });

      await commentIssue('PROJ-42', 'Private note', {
        visibilityType: 'role',
        visibilityValue: 'Developers',
      });

      const payload = mockedRequest.mock.calls[0][2] as Record<string, unknown>;
      expect(payload.visibility).toEqual({
        type: 'role',
        value: 'Developers',
      });
    });

    it('throws when body is missing', async () => {
      await expect(commentIssue('PROJ-42', '')).rejects.toThrow('--body is required');
    });
  });

  describe('transitionIssue', () => {
    it('resolves transition name and executes', async () => {
      mockedRequest
        .mockResolvedValueOnce({
          transitions: [
            { id: '31', name: 'Done' },
            { id: '21', name: 'In Progress' },
          ],
        })
        .mockResolvedValueOnce({});

      await transitionIssue('PROJ-42', 'Done');

      expect(mockedRequest).toHaveBeenCalledTimes(2);
      expect(mockedRequest).toHaveBeenNthCalledWith(1, 'GET', '/issue/PROJ-42/transitions');
      expect(mockedRequest).toHaveBeenNthCalledWith(2, 'POST', '/issue/PROJ-42/transitions', {
        transition: { id: '31' },
      });
    });

    it('matches transition name case-insensitively', async () => {
      mockedRequest
        .mockResolvedValueOnce({
          transitions: [{ id: '31', name: 'Done' }],
        })
        .mockResolvedValueOnce({});

      await transitionIssue('PROJ-42', 'done');

      expect(mockedRequest).toHaveBeenNthCalledWith(2, 'POST', '/issue/PROJ-42/transitions', {
        transition: { id: '31' },
      });
    });

    it('accepts numeric transition ID', async () => {
      mockedRequest
        .mockResolvedValueOnce({
          transitions: [{ id: '31', name: 'Done' }],
        })
        .mockResolvedValueOnce({});

      await transitionIssue('PROJ-42', '31');

      expect(mockedRequest).toHaveBeenNthCalledWith(2, 'POST', '/issue/PROJ-42/transitions', {
        transition: { id: '31' },
      });
    });

    it('throws when transition not found', async () => {
      mockedRequest.mockResolvedValueOnce({
        transitions: [{ id: '21', name: 'In Progress' }],
      });

      await expect(transitionIssue('PROJ-42', 'Done')).rejects.toThrow(
        'Transition "Done" not found'
      );
    });

    it('throws when key is missing', async () => {
      await expect(transitionIssue('', 'Done')).rejects.toThrow('Issue key is required');
    });
  });
});
