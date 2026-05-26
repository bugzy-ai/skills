import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/clickup-client', () => ({
  request: vi.fn(),
  getTeamId: vi.fn().mockReturnValue('team123'),
}));

import { searchTasks, getTask, createTask, updateTask, commentTask } from '../../src/commands/task';
import { request, getTeamId } from '../../src/clickup-client';

const mockedRequest = vi.mocked(request);
const mockedGetTeamId = vi.mocked(getTeamId);

describe('task commands', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.clearAllMocks();
    mockedGetTeamId.mockReturnValue('team123');
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('searchTasks', () => {
    it('searches workspace-wide with query filter', async () => {
      mockedRequest.mockResolvedValue({
        tasks: [
          { id: '1', name: 'Login bug', description: 'desc' },
          { id: '2', name: 'Other task', description: '' },
        ],
        last_page: true,
      });

      await searchTasks({ query: 'login' });

      expect(mockedRequest).toHaveBeenCalledWith(
        'GET',
        expect.stringContaining('/team/team123/task?')
      );
      // Should filter by query client-side
      const output = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(output).toHaveLength(1);
      expect(output[0].name).toBe('Login bug');
    });

    it('passes space and status filters', async () => {
      mockedRequest.mockResolvedValue({ tasks: [], last_page: true });

      await searchTasks({ space: 'sp1', status: 'open' });

      const url = mockedRequest.mock.calls[0][1];
      expect(url).toContain('space_ids%5B%5D=sp1');
      expect(url).toContain('statuses%5B%5D=open');
    });

    it('applies limit', async () => {
      const tasks = Array.from({ length: 10 }, (_, i) => ({
        id: String(i),
        name: `Task ${i}`,
      }));
      mockedRequest.mockResolvedValue({ tasks, last_page: true });

      await searchTasks({ limit: '3' });

      const output = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(output).toHaveLength(3);
    });
  });

  describe('getTask', () => {
    it('throws when task ID is missing', async () => {
      await expect(getTask('')).rejects.toThrow('Task ID is required');
    });

    it('gets task by ID', async () => {
      const task = { id: 'abc', name: 'My task' };
      mockedRequest.mockResolvedValue(task);

      await getTask('abc');

      expect(mockedRequest).toHaveBeenCalledWith('GET', '/task/abc');
      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(task));
    });

    it('falls back to custom task ID on failure', async () => {
      const task = { id: 'abc', custom_id: 'PROJ-123', name: 'My task' };
      mockedRequest
        .mockRejectedValueOnce(new Error('Not found'))
        .mockResolvedValueOnce(task);

      await getTask('PROJ-123');

      expect(mockedRequest).toHaveBeenCalledTimes(2);
      expect(mockedRequest).toHaveBeenLastCalledWith(
        'GET',
        '/task/PROJ-123?custom_task_ids=true&team_id=team123'
      );
    });
  });

  describe('createTask', () => {
    it('throws when list is missing', async () => {
      await expect(createTask({ list: '', name: 'test' })).rejects.toThrow(
        '--list is required'
      );
    });

    it('throws when name is missing', async () => {
      await expect(createTask({ list: 'l1', name: '' })).rejects.toThrow(
        '--name is required'
      );
    });

    it('creates task with all options', async () => {
      const task = { id: 'new', name: 'Bug: Login' };
      mockedRequest.mockResolvedValue(task);

      await createTask({
        list: 'l1',
        name: 'Bug: Login',
        description: 'Steps...',
        status: 'Open',
        priority: '2',
        assignee: '789',
      });

      expect(mockedRequest).toHaveBeenCalledWith('POST', '/list/l1/task', {
        name: 'Bug: Login',
        description: 'Steps...',
        status: 'Open',
        priority: 2,
        assignees: [789],
      });
    });
  });

  describe('updateTask', () => {
    it('throws when task ID is missing', async () => {
      await expect(updateTask('', {})).rejects.toThrow('Task ID is required');
    });

    it('throws when no options provided', async () => {
      await expect(updateTask('abc', {})).rejects.toThrow('No update options');
    });

    it('updates task with status and priority', async () => {
      const task = { id: 'abc', name: 'Updated' };
      mockedRequest.mockResolvedValue(task);

      await updateTask('abc', { status: 'closed', priority: '1' });

      expect(mockedRequest).toHaveBeenCalledWith('PUT', '/task/abc', {
        status: 'closed',
        priority: 1,
      });
    });
  });

  describe('commentTask', () => {
    it('throws when task ID is missing', async () => {
      await expect(commentTask('', 'text')).rejects.toThrow('Task ID is required');
    });

    it('throws when body is missing', async () => {
      await expect(commentTask('abc', '')).rejects.toThrow('--body is required');
    });

    it('adds comment to task', async () => {
      const comment = { id: 'c1', comment_text: 'Test passed' };
      mockedRequest.mockResolvedValue(comment);

      await commentTask('abc', 'Test passed');

      expect(mockedRequest).toHaveBeenCalledWith('POST', '/task/abc/comment', {
        comment_text: 'Test passed',
      });
    });
  });
});
