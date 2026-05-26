import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/clickup-client', () => ({
  request: vi.fn(),
  getTeamId: vi.fn().mockReturnValue('team123'),
}));

import { listSpaces } from '../../src/commands/space';
import { request } from '../../src/clickup-client';

const mockedRequest = vi.mocked(request);

describe('space commands', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('lists spaces for the workspace', async () => {
    const spaces = [
      { id: 's1', name: 'Engineering', statuses: [] },
      { id: 's2', name: 'Product', statuses: [] },
    ];
    mockedRequest.mockResolvedValue({ spaces });

    await listSpaces();

    expect(mockedRequest).toHaveBeenCalledWith('GET', '/team/team123/space');
    expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(spaces));
  });
});
