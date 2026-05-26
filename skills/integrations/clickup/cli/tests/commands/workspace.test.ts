import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/clickup-client', () => ({
  request: vi.fn(),
}));

import { listWorkspaces } from '../../src/commands/workspace';
import { request } from '../../src/clickup-client';

const mockedRequest = vi.mocked(request);

describe('workspace commands', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('lists authorized workspaces', async () => {
    const teams = [
      { id: 't1', name: 'My Workspace', members: [] },
      { id: 't2', name: 'Other Workspace', members: [] },
    ];
    mockedRequest.mockResolvedValue({ teams });

    await listWorkspaces();

    expect(mockedRequest).toHaveBeenCalledWith('GET', '/team');
    expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(teams));
  });
});
