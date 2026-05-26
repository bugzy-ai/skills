import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';
import { createProjectCommand } from '../../src/commands/project';
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

describe('project commands', () => {
  let mockHandlers: ToolHandlers;
  let program: Command;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockHandlers = createMockHandlers();
    program = new Command().exitOverride();
    program.addCommand(createProjectCommand(mockHandlers));
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('process.exit'); });
  });

  describe('project list', () => {
    it('calls listProjects with defaults', async () => {
      vi.mocked(mockHandlers.listProjects).mockResolvedValue({
        success: true,
        data: { data: [{ gid: 'p1', name: 'Project 1', resource_type: 'project' }], next_page: null },
      });

      await program.parseAsync(['node', 'test', 'project', 'list']);

      expect(mockHandlers.listProjects).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 100 })
      );
    });

    it('passes workspace override', async () => {
      vi.mocked(mockHandlers.listProjects).mockResolvedValue({
        success: true,
        data: { data: [], next_page: null },
      });

      await program.parseAsync([
        'node', 'test', 'project', 'list', '-w', 'custom-ws',
      ]);

      expect(mockHandlers.listProjects).toHaveBeenCalledWith(
        expect.objectContaining({ workspace_gid: 'custom-ws' })
      );
    });

    it('passes limit option', async () => {
      vi.mocked(mockHandlers.listProjects).mockResolvedValue({
        success: true,
        data: { data: [], next_page: null },
      });

      await program.parseAsync([
        'node', 'test', 'project', 'list', '-l', '50',
      ]);

      expect(mockHandlers.listProjects).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 50 })
      );
    });

    it('outputs JSON when --json flag is set', async () => {
      vi.mocked(mockHandlers.listProjects).mockResolvedValue({
        success: true,
        data: { data: [{ gid: 'p1', name: 'P1', resource_type: 'project' }], next_page: null },
      });

      await program.parseAsync(['node', 'test', 'project', 'list', '--json']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"data"'));
    });

    it('outputs formatted text by default', async () => {
      vi.mocked(mockHandlers.listProjects).mockResolvedValue({
        success: true,
        data: { data: [{ gid: 'p1', name: 'My Project', resource_type: 'project' }], next_page: null },
      });

      await program.parseAsync(['node', 'test', 'project', 'list']);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('My Project'));
    });

    it('exits with code 1 on handler failure', async () => {
      vi.mocked(mockHandlers.listProjects).mockResolvedValue({
        success: false,
        error: 'Unauthorized',
      });

      await expect(
        program.parseAsync(['node', 'test', 'project', 'list'])
      ).rejects.toThrow('process.exit');
    });
  });
});
