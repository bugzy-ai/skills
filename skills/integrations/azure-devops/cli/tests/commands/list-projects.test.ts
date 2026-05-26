import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { listProjectsCommand } from '../../src/commands/list-projects';

vi.mock('../../src/api-client', () => ({
  listProjects: vi.fn().mockResolvedValue([
    { id: '1', name: 'Project1', state: 'wellFormed', visibility: 'private' },
  ]),
}));

describe('listProjectsCommand', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls listProjects and outputs JSON', async () => {
    const consoleSpy = vi.spyOn(console, 'log');

    await listProjectsCommand({});

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Project1')
    );
  });

  it('passes pagination options', async () => {
    const { listProjects } = await import('../../src/api-client');

    await listProjectsCommand({ top: '10', skip: '5' });

    expect(listProjects).toHaveBeenCalledWith(
      expect.objectContaining({ top: 10, skip: 5 })
    );
  });
});
