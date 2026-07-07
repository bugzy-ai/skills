import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/jira-client', () => ({
  request: vi.fn(),
}));

vi.mock('../../src/commands/project', () => ({
  getProject: vi.fn(),
}));

import { request } from '../../src/jira-client';
import { getProject } from '../../src/commands/project';
import { ensureVersion, listVersions } from '../../src/commands/version';

const mockedRequest = vi.mocked(request);
const mockedGetProject = vi.mocked(getProject);

describe('version commands', () => {
  let writeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.clearAllMocks();
  });

  afterEach(() => {
    writeSpy.mockRestore();
  });

  it('lists project versions', async () => {
    mockedRequest.mockResolvedValue([{ id: '10001', name: '1.0.0' }]);

    await listVersions({ project: 'PROJ' });

    expect(mockedRequest).toHaveBeenCalledWith('GET', '/project/PROJ/versions');
    expect(JSON.parse(writeSpy.mock.calls[0][0] as string)).toEqual([{ id: '10001', name: '1.0.0' }]);
  });

  it('reuses an existing version by exact name', async () => {
    mockedRequest.mockResolvedValue([{ id: '10001', name: '1.0.0', released: false, archived: false }]);

    await ensureVersion({ project: 'PROJ', name: '1.0.0' });

    expect(mockedRequest).toHaveBeenCalledTimes(1);
    expect(mockedGetProject).not.toHaveBeenCalled();
    expect(JSON.parse(writeSpy.mock.calls[0][0] as string)).toEqual({
      created: false,
      version: { id: '10001', name: '1.0.0', released: false, archived: false },
    });
  });

  it('does not reuse archived or released versions', async () => {
    mockedRequest.mockResolvedValue([
      { id: '10001', name: '1.0.0', released: true, archived: false },
      { id: '10002', name: '1.0.0', released: false, archived: true },
    ]);

    await expect(ensureVersion({ project: 'PROJ', name: '1.0.0' })).rejects.toThrow(
      'exists but is archived or released'
    );
    expect(mockedGetProject).not.toHaveBeenCalled();
  });

  it('creates a missing version using the Jira project ID', async () => {
    mockedRequest
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({ id: '10002', name: '1.0.0', projectId: 10000 });
    mockedGetProject.mockResolvedValue({ id: '10000', key: 'PROJ', name: 'Project' });

    await ensureVersion({ project: 'PROJ', name: '1.0.0', description: 'Release 1.0.0' });

    expect(mockedRequest).toHaveBeenNthCalledWith(1, 'GET', '/project/PROJ/versions');
    expect(mockedRequest).toHaveBeenNthCalledWith(2, 'POST', '/version', {
      name: '1.0.0',
      projectId: 10000,
      released: false,
      archived: false,
      description: 'Release 1.0.0',
    });
    expect(JSON.parse(writeSpy.mock.calls[0][0] as string).created).toBe(true);
  });

  it('fails clearly before API calls when required input is missing', async () => {
    await expect(ensureVersion({ project: '', name: '1.0.0' })).rejects.toThrow('--project is required');
    await expect(ensureVersion({ project: 'PROJ' })).rejects.toThrow('--name is required');
    expect(mockedRequest).not.toHaveBeenCalled();
  });
});
