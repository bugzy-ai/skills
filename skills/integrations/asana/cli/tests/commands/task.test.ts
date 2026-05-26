import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';
import { createTaskCommand } from '../../src/commands/task';
import type { ToolHandlers } from '../../src/tool-handlers';

function createMockHandlers(): ToolHandlers {
  return {
    searchTasks: vi.fn(),
    getTask: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    addComment: vi.fn(),
    listProjects: vi.fn(),
  } as unknown as ToolHandlers;
}

describe('task commands', () => {
  let mockHandlers: ToolHandlers;
  let program: Command;
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockHandlers = createMockHandlers();
    program = new Command().exitOverride();
    program.addCommand(createTaskCommand(mockHandlers));
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('process.exit'); });
  });

  describe('task search', () => {
    it('calls searchTasks with correct args', async () => {
      vi.mocked(mockHandlers.searchTasks).mockResolvedValue({
        success: true,
        data: { data: [{ gid: '1', name: 'Bug', resource_type: 'task' }], next_page: null },
      });

      await program.parseAsync(['node', 'test', 'task', 'search', '-q', 'login bug']);

      expect(mockHandlers.searchTasks).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'login bug' })
      );
    });

    it('outputs JSON when --json flag is set', async () => {
      vi.mocked(mockHandlers.searchTasks).mockResolvedValue({
        success: true,
        data: { data: [], next_page: null },
      });

      await program.parseAsync(['node', 'test', 'task', 'search', '-q', 'test', '--json']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"data"'));
    });

    it('passes project and assignee filters', async () => {
      vi.mocked(mockHandlers.searchTasks).mockResolvedValue({
        success: true,
        data: { data: [], next_page: null },
      });

      await program.parseAsync([
        'node', 'test', 'task', 'search',
        '-q', 'test', '-p', 'proj-1', '-a', 'user-1',
      ]);

      expect(mockHandlers.searchTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          project_gid: 'proj-1',
          assignee: 'user-1',
        })
      );
    });
  });

  describe('task get', () => {
    it('calls getTask with GID', async () => {
      vi.mocked(mockHandlers.getTask).mockResolvedValue({
        success: true,
        data: { data: { gid: '123', name: 'Task', resource_type: 'task' } },
      });

      await program.parseAsync(['node', 'test', 'task', 'get', '123']);

      expect(mockHandlers.getTask).toHaveBeenCalledWith({ task_gid: '123' });
    });

    it('outputs formatted text by default', async () => {
      vi.mocked(mockHandlers.getTask).mockResolvedValue({
        success: true,
        data: { data: { gid: '123', name: 'My Task', resource_type: 'task' } },
      });

      await program.parseAsync(['node', 'test', 'task', 'get', '123']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('My Task'));
    });
  });

  describe('task create', () => {
    it('calls createTask with required options', async () => {
      vi.mocked(mockHandlers.createTask).mockResolvedValue({
        success: true,
        data: { data: { gid: '789', name: 'New', resource_type: 'task' } },
      });

      await program.parseAsync([
        'node', 'test', 'task', 'create',
        '-n', 'New Task', '-p', 'proj-1',
      ]);

      expect(mockHandlers.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Task',
          project_gid: 'proj-1',
        })
      );
    });

    it('passes optional create fields', async () => {
      vi.mocked(mockHandlers.createTask).mockResolvedValue({
        success: true,
        data: { data: { gid: '789', name: 'New', resource_type: 'task' } },
      });

      await program.parseAsync([
        'node', 'test', 'task', 'create',
        '-n', 'Task', '-p', 'proj-1',
        '-d', 'Description', '-a', 'user-1', '--due', '2026-03-01',
      ]);

      expect(mockHandlers.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Description',
          assignee_gid: 'user-1',
          due_date: '2026-03-01',
        })
      );
    });
  });

  describe('task update', () => {
    it('calls updateTask with GID and options', async () => {
      vi.mocked(mockHandlers.updateTask).mockResolvedValue({
        success: true,
        data: { data: { gid: '123', name: 'Updated', resource_type: 'task' } },
      });

      await program.parseAsync([
        'node', 'test', 'task', 'update', '123',
        '-n', 'Updated Name', '--completed',
      ]);

      expect(mockHandlers.updateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          task_gid: '123',
          name: 'Updated Name',
          completed: true,
        })
      );
    });

    it('handles --incomplete flag', async () => {
      vi.mocked(mockHandlers.updateTask).mockResolvedValue({
        success: true,
        data: { data: { gid: '123', name: 'Task', resource_type: 'task' } },
      });

      await program.parseAsync([
        'node', 'test', 'task', 'update', '123', '--incomplete',
      ]);

      expect(mockHandlers.updateTask).toHaveBeenCalledWith(
        expect.objectContaining({ completed: false })
      );
    });
  });

  describe('task comment', () => {
    it('calls addComment with GID and body', async () => {
      vi.mocked(mockHandlers.addComment).mockResolvedValue({
        success: true,
        data: { data: { gid: 's1', resource_type: 'story', text: 'hi', type: 'comment', created_at: '2026-01-01' } },
      });

      await program.parseAsync([
        'node', 'test', 'task', 'comment', '123',
        '-b', 'Great progress!',
      ]);

      expect(mockHandlers.addComment).toHaveBeenCalledWith({
        task_gid: '123',
        text: 'Great progress!',
      });
    });
  });

  describe('error handling', () => {
    it('exits with code 1 on handler failure', async () => {
      vi.mocked(mockHandlers.getTask).mockResolvedValue({
        success: false,
        error: 'Not found',
      });

      await expect(
        program.parseAsync(['node', 'test', 'task', 'get', '999'])
      ).rejects.toThrow('process.exit');
    });
  });
});
