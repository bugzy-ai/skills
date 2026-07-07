import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/jira-client', () => ({
  request: vi.fn(),
}));

import { request } from '../../src/jira-client';
import { getProject, listProjects } from '../../src/commands/project';

const mockedRequest = vi.mocked(request);

describe('project commands', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('lists projects', async () => {
    mockedRequest.mockResolvedValue({
      values: [{ key: 'PROJ', name: 'Project' }],
    });

    await listProjects();

    expect(mockedRequest).toHaveBeenCalledWith('GET', '/project/search');
    expect(consoleSpy).toHaveBeenCalledWith(
      JSON.stringify([{ key: 'PROJ', name: 'Project' }])
    );
  });

  it('gets a project by key', async () => {
    mockedRequest.mockResolvedValue({ id: '10000', key: 'PROJ', name: 'Project' });

    await expect(getProject('PROJ')).resolves.toEqual({
      id: '10000', key: 'PROJ', name: 'Project',
    });

    expect(mockedRequest).toHaveBeenCalledWith('GET', '/project/PROJ');
  });
});
