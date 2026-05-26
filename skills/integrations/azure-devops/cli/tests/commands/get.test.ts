import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCommand } from '../../src/commands/get';

vi.mock('../../src/api-client', () => ({
  getWorkItem: vi.fn().mockResolvedValue({ id: 123, fields: { 'System.Title': 'Test' } }),
}));

describe('getCommand', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws when ID is missing', async () => {
    await expect(getCommand('', { project: 'MyProject' })).rejects.toThrow('ID is required');
  });

  it('throws when --project is missing', async () => {
    await expect(getCommand('123', { project: '' })).rejects.toThrow('--project is required');
  });

  it('throws on invalid ID', async () => {
    await expect(getCommand('abc', { project: 'MyProject' })).rejects.toThrow('Invalid work item ID');
  });

  it('calls getWorkItem with correct params', async () => {
    const { getWorkItem } = await import('../../src/api-client');

    await getCommand('123', { project: 'MyProject', fields: 'System.Title', expand: 'All' });

    expect(getWorkItem).toHaveBeenCalledWith(123, 'MyProject', {
      fields: 'System.Title',
      expand: 'All',
    });
  });
});
