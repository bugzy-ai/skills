import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToolHandlers } from '../src/tool-handlers';
import type { AsanaClient } from '../src/asana-client';

function createMockClient(): AsanaClient {
  return {
    searchTasks: vi.fn(),
    getTask: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    addComment: vi.fn(),
    listProjects: vi.fn(),
  } as unknown as AsanaClient;
}

describe('ToolHandlers', () => {
  let mockClient: AsanaClient;
  let handlers: ToolHandlers;

  beforeEach(() => {
    mockClient = createMockClient();
    handlers = new ToolHandlers(mockClient);
  });

  describe('searchTasks', () => {
    it('validates input and calls client', async () => {
      vi.mocked(mockClient.searchTasks).mockResolvedValue({
        data: [{ gid: '1', name: 'Task 1', resource_type: 'task' }],
      });

      const result = await handlers.searchTasks({
        query: 'test',
        limit: 10,
      });

      expect(result.success).toBe(true);
      expect(mockClient.searchTasks).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'test', limit: 10 })
      );
    });

    it('returns error on invalid input', async () => {
      const result = await handlers.searchTasks({});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getTask', () => {
    it('validates and fetches task', async () => {
      vi.mocked(mockClient.getTask).mockResolvedValue({
        data: { gid: '123', name: 'Test', resource_type: 'task' },
      });

      const result = await handlers.getTask({ task_gid: '123' });

      expect(result.success).toBe(true);
      expect(mockClient.getTask).toHaveBeenCalledWith('123');
    });

    it('returns error when task_gid missing', async () => {
      const result = await handlers.getTask({});

      expect(result.success).toBe(false);
    });
  });

  describe('createTask', () => {
    it('validates and creates task', async () => {
      vi.mocked(mockClient.createTask).mockResolvedValue({
        data: { gid: '789', name: 'New Task', resource_type: 'task' },
      });

      const result = await handlers.createTask({
        name: 'New Task',
        project_gid: 'proj-1',
        description: 'Desc',
      });

      expect(result.success).toBe(true);
      expect(mockClient.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Task',
          projectGid: 'proj-1',
          description: 'Desc',
        })
      );
    });

    it('returns error when required fields missing', async () => {
      const result = await handlers.createTask({ name: 'Only name' });

      expect(result.success).toBe(false);
    });
  });

  describe('updateTask', () => {
    it('validates and updates task', async () => {
      vi.mocked(mockClient.updateTask).mockResolvedValue({
        data: { gid: '123', name: 'Updated', resource_type: 'task' },
      });

      const result = await handlers.updateTask({
        task_gid: '123',
        name: 'Updated',
        completed: true,
      });

      expect(result.success).toBe(true);
      expect(mockClient.updateTask).toHaveBeenCalledWith('123', {
        name: 'Updated',
        completed: true,
        assigneeGid: undefined,
        dueDate: undefined,
        description: undefined,
      });
    });
  });

  describe('addComment', () => {
    it('validates and adds comment', async () => {
      vi.mocked(mockClient.addComment).mockResolvedValue({
        data: { gid: 's1', resource_type: 'story', text: 'comment', type: 'comment', created_at: '2026-01-01' },
      });

      const result = await handlers.addComment({
        task_gid: '123',
        text: 'Great work!',
      });

      expect(result.success).toBe(true);
      expect(mockClient.addComment).toHaveBeenCalledWith('123', 'Great work!');
    });

    it('returns error when text missing', async () => {
      const result = await handlers.addComment({ task_gid: '123' });

      expect(result.success).toBe(false);
    });
  });

  describe('listProjects', () => {
    it('validates and lists projects', async () => {
      vi.mocked(mockClient.listProjects).mockResolvedValue({
        data: [{ gid: 'p1', name: 'Project 1', resource_type: 'project' }],
      });

      const result = await handlers.listProjects({
        limit: 50,
      });

      expect(result.success).toBe(true);
      expect(mockClient.listProjects).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 50 })
      );
    });

    it('uses defaults when no options provided', async () => {
      vi.mocked(mockClient.listProjects).mockResolvedValue({
        data: [],
      });

      const result = await handlers.listProjects({});

      expect(result.success).toBe(true);
      expect(mockClient.listProjects).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 100 })
      );
    });
  });

  describe('error handling', () => {
    it('catches client errors and returns structured error', async () => {
      vi.mocked(mockClient.searchTasks).mockRejectedValue(
        new Error('HTTP 500: Internal Server Error')
      );

      const result = await handlers.searchTasks({ query: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('HTTP 500: Internal Server Error');
    });
  });
});
