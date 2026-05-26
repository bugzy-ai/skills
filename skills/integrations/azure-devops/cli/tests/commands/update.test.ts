import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { updateCommand } from '../../src/commands/update';

vi.mock('../../src/api-client', () => ({
  updateWorkItem: vi.fn().mockResolvedValue({ id: 42, rev: 2, fields: {} }),
  buildJsonPatch: vi.fn((fields) => {
    return Object.entries(fields)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => ({ op: 'add', path: `/fields/${k}`, value: v }));
  }),
}));

describe('updateCommand', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws when ID is missing', async () => {
    await expect(updateCommand('', { project: 'MyProject', state: 'Active' })).rejects.toThrow(
      'ID is required'
    );
  });

  it('throws when --project is missing', async () => {
    await expect(updateCommand('42', { project: '', state: 'Active' })).rejects.toThrow(
      '--project is required'
    );
  });

  it('throws on invalid ID', async () => {
    await expect(updateCommand('abc', { project: 'MyProject', state: 'Active' })).rejects.toThrow(
      'Invalid work item ID'
    );
  });

  it('uses friendly flags to build operations', async () => {
    const { updateWorkItem } = await import('../../src/api-client');

    await updateCommand('42', { project: 'MyProject', state: 'Resolved', priority: '2' });

    expect(updateWorkItem).toHaveBeenCalledWith(42, expect.any(Array), 'MyProject');
  });

  it('uses raw --operations when provided (takes precedence)', async () => {
    const { updateWorkItem } = await import('../../src/api-client');
    const rawOps = JSON.stringify([
      { op: 'add', path: '/fields/System.State', value: 'Resolved' },
    ]);

    await updateCommand('42', {
      project: 'MyProject',
      state: 'Active', // Should be ignored when --operations is present
      operations: rawOps,
    });

    const calledOps = (updateWorkItem as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(calledOps).toEqual([
      { op: 'add', path: '/fields/System.State', value: 'Resolved' },
    ]);
  });

  it('throws when no fields or operations provided', async () => {
    await expect(updateCommand('42', { project: 'MyProject' })).rejects.toThrow(
      'At least one field'
    );
  });
});
