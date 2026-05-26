import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AsanaClient, AsanaClientError } from '../src/asana-client';

const ENV_BACKUP = { ...process.env };
const mockFetchFn = vi.fn();

beforeEach(() => {
  process.env.ASANA_ACCESS_TOKEN = 'test-token-123';
  process.env.ASANA_WORKSPACE_GID = 'workspace-gid-456';
  mockFetchFn.mockReset();
  vi.stubGlobal('fetch', mockFetchFn);
});

afterEach(() => {
  process.env = { ...ENV_BACKUP };
  vi.restoreAllMocks();
});

function mockResponse(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    text: () => Promise.resolve(JSON.stringify(data)),
    headers: new Headers(headers),
  } as Response;
}

describe('AsanaClient', () => {
  describe('constructor', () => {
    it('throws if ASANA_ACCESS_TOKEN is missing', () => {
      delete process.env.ASANA_ACCESS_TOKEN;
      expect(() => new AsanaClient()).toThrow('ASANA_ACCESS_TOKEN environment variable is required');
    });

    it('throws if ASANA_WORKSPACE_GID is missing', () => {
      delete process.env.ASANA_WORKSPACE_GID;
      expect(() => new AsanaClient()).toThrow('ASANA_WORKSPACE_GID environment variable is required');
    });
  });

  describe('searchTasks', () => {
    it('sends correct Authorization header and query params', async () => {
      const client = new AsanaClient();
      mockFetchFn.mockResolvedValue(
        mockResponse({ data: [], next_page: null })
      );

      await client.searchTasks({ query: 'test bug' });

      expect(mockFetchFn).toHaveBeenCalledWith(
        expect.stringContaining('/workspaces/workspace-gid-456/tasks/search'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token-123',
          }),
        })
      );

      const url = mockFetchFn.mock.calls[0][0] as string;
      expect(url).toContain('text=test+bug');
      expect(url).toContain('completed=false');
    });

    it('uses workspace override when provided', async () => {
      const client = new AsanaClient();
      mockFetchFn.mockResolvedValue(
        mockResponse({ data: [], next_page: null })
      );

      await client.searchTasks({ query: 'test', workspaceGid: 'custom-ws' });

      const url = mockFetchFn.mock.calls[0][0] as string;
      expect(url).toContain('/workspaces/custom-ws/tasks/search');
    });
  });

  describe('getTask', () => {
    it('fetches task by GID', async () => {
      const client = new AsanaClient();
      const taskData = { data: { gid: '123', name: 'Test Task', resource_type: 'task' } };
      mockFetchFn.mockResolvedValue(mockResponse(taskData));

      const result = await client.getTask('123');

      expect(result.data.gid).toBe('123');
      const url = mockFetchFn.mock.calls[0][0] as string;
      expect(url).toContain('/tasks/123');
    });
  });

  describe('createTask', () => {
    it('sends POST with task data', async () => {
      const client = new AsanaClient();
      const taskData = { data: { gid: '789', name: 'New Task', resource_type: 'task' } };
      mockFetchFn.mockResolvedValue(mockResponse(taskData));

      await client.createTask({
        name: 'New Task',
        projectGid: 'proj-1',
        description: 'A description',
        assigneeGid: 'user-1',
        dueDate: '2026-03-01',
      });

      expect(mockFetchFn).toHaveBeenCalledWith(
        expect.stringContaining('/tasks'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"name":"New Task"'),
        })
      );
    });
  });

  describe('updateTask', () => {
    it('sends PUT with updated fields', async () => {
      const client = new AsanaClient();
      const taskData = { data: { gid: '123', name: 'Updated', resource_type: 'task' } };
      mockFetchFn.mockResolvedValue(mockResponse(taskData));

      await client.updateTask('123', { name: 'Updated', completed: true });

      expect(mockFetchFn).toHaveBeenCalledWith(
        expect.stringContaining('/tasks/123'),
        expect.objectContaining({ method: 'PUT' })
      );
    });

    it('handles null assignee for unassign', async () => {
      const client = new AsanaClient();
      mockFetchFn.mockResolvedValue(
        mockResponse({ data: { gid: '123', name: 'Test', resource_type: 'task' } })
      );

      await client.updateTask('123', { assigneeGid: 'null' });

      const body = JSON.parse(mockFetchFn.mock.calls[0][1]?.body as string);
      expect(body.data.assignee).toBeNull();
    });

    it('handles null due date to clear', async () => {
      const client = new AsanaClient();
      mockFetchFn.mockResolvedValue(
        mockResponse({ data: { gid: '123', name: 'Test', resource_type: 'task' } })
      );

      await client.updateTask('123', { dueDate: 'null' });

      const body = JSON.parse(mockFetchFn.mock.calls[0][1]?.body as string);
      expect(body.data.due_on).toBeNull();
    });
  });

  describe('addComment', () => {
    it('sends POST with comment text', async () => {
      const client = new AsanaClient();
      const storyData = { data: { gid: 's1', resource_type: 'story', text: 'hi', type: 'comment', created_at: '2026-01-01' } };
      mockFetchFn.mockResolvedValue(mockResponse(storyData));

      await client.addComment('123', 'Great progress!');

      expect(mockFetchFn).toHaveBeenCalledWith(
        expect.stringContaining('/tasks/123/stories'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('listProjects', () => {
    it('fetches projects for default workspace', async () => {
      const client = new AsanaClient();
      mockFetchFn.mockResolvedValue(
        mockResponse({ data: [{ gid: 'p1', name: 'Project 1' }], next_page: null })
      );

      const result = await client.listProjects({});

      expect(result.data).toHaveLength(1);
      const url = mockFetchFn.mock.calls[0][0] as string;
      expect(url).toContain('/workspaces/workspace-gid-456/projects');
    });
  });

  describe('retry logic', () => {
    it('retries on HTTP 429 with Retry-After header', async () => {
      const client = new AsanaClient();

      // First call: 429 rate limited
      mockFetchFn.mockResolvedValueOnce(
        mockResponse(
          { errors: [{ message: 'Rate limited' }] },
          429,
          { 'Retry-After': '0' }
        )
      );
      // Second call: success
      mockFetchFn.mockResolvedValueOnce(
        mockResponse({ data: [], next_page: null })
      );

      const result = await client.searchTasks({ query: 'test' });

      expect(mockFetchFn).toHaveBeenCalledTimes(2);
      expect(result.data).toEqual([]);
    });

    it('gives up after MAX_RETRIES', async () => {
      const client = new AsanaClient();

      // All calls return 429
      for (let i = 0; i < 4; i++) {
        mockFetchFn.mockResolvedValueOnce(
          mockResponse(
            { errors: [{ message: 'Rate limited' }] },
            429,
            { 'Retry-After': '0' }
          )
        );
      }

      await expect(client.searchTasks({ query: 'test' })).rejects.toThrow();
    });
  });

  describe('error handling', () => {
    it('throws AsanaClientError on HTTP errors', async () => {
      const client = new AsanaClient();
      mockFetchFn.mockResolvedValue(
        mockResponse({ errors: [{ message: 'Not found' }] }, 404)
      );

      await expect(client.getTask('nonexistent')).rejects.toThrow(AsanaClientError);
    });

    it('throws on network errors', async () => {
      const client = new AsanaClient();
      mockFetchFn.mockRejectedValue(new Error('Network failure'));

      await expect(client.getTask('123')).rejects.toThrow('Network error');
    });
  });
});
