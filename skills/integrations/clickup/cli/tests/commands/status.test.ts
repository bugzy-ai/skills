import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/clickup-client', () => ({
  request: vi.fn(),
}));

import { listStatuses } from '../../src/commands/status';
import { request } from '../../src/clickup-client';

const mockedRequest = vi.mocked(request);

describe('status commands', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('throws when list ID is missing', async () => {
    await expect(listStatuses('')).rejects.toThrow('--list is required');
  });

  it('lists statuses for a list', async () => {
    const statuses = [
      { status: 'Open', type: 'open', orderindex: 0, color: '#d3d3d3' },
      { status: 'In Progress', type: 'custom', orderindex: 1, color: '#4194f6' },
      { status: 'Closed', type: 'closed', orderindex: 2, color: '#6bc950' },
    ];
    mockedRequest.mockResolvedValue({ statuses });

    await listStatuses('list1');

    expect(mockedRequest).toHaveBeenCalledWith('GET', '/list/list1');
    expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(statuses));
  });

  it('returns empty array when list has no statuses', async () => {
    mockedRequest.mockResolvedValue({});

    await listStatuses('list1');

    expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify([]));
  });
});
