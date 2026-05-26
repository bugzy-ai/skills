import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/clickup-client', () => ({
  request: vi.fn(),
}));

import { listLists } from '../../src/commands/list';
import { request } from '../../src/clickup-client';

const mockedRequest = vi.mocked(request);

describe('list commands', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('throws when space ID is missing', async () => {
    await expect(listLists('')).rejects.toThrow('--space is required');
  });

  it('combines folderless and folder-based lists', async () => {
    mockedRequest
      .mockResolvedValueOnce({
        lists: [{ id: 'l1', name: 'Backlog', space: { id: 's1', name: 'Eng' } }],
      })
      .mockResolvedValueOnce({
        folders: [
          {
            id: 'f1',
            name: 'Sprint 1',
            lists: [{ id: 'l2', name: 'Tasks', space: { id: 's1', name: 'Eng' } }],
          },
        ],
      });

    await listLists('s1');

    expect(mockedRequest).toHaveBeenCalledTimes(2);
    expect(mockedRequest).toHaveBeenCalledWith('GET', '/space/s1/list');
    expect(mockedRequest).toHaveBeenCalledWith('GET', '/space/s1/folder');

    const output = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(output).toHaveLength(2);
    expect(output[0].name).toBe('Backlog');
    expect(output[1].name).toBe('Tasks');
    expect(output[1].folder_name).toBe('Sprint 1');
  });
});
