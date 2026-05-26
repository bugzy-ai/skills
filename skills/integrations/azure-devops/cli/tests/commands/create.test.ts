import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createCommand } from '../../src/commands/create';

vi.mock('../../src/api-client', () => ({
  createWorkItem: vi.fn().mockResolvedValue({ id: 1, rev: 1, fields: {} }),
  buildJsonPatch: vi.fn((fields) => {
    // Simple mock that returns ops
    return Object.entries(fields)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => ({ op: 'add', path: `/fields/${k}`, value: v }));
  }),
  getBaseUrl: vi.fn().mockReturnValue('https://dev.azure.com/my-org'),
}));

describe('createCommand', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws when --project is missing', async () => {
    await expect(
      createCommand({ project: '', type: 'Bug', title: 'Test' })
    ).rejects.toThrow('--project is required');
  });

  it('throws when --type is missing', async () => {
    await expect(
      createCommand({ project: 'MyProject', type: '', title: 'Test' })
    ).rejects.toThrow('--type is required');
  });

  it('throws when --title is missing', async () => {
    await expect(
      createCommand({ project: 'MyProject', type: 'Bug', title: '' })
    ).rejects.toThrow('--title is required');
  });

  it('calls createWorkItem with correct type and project', async () => {
    const { createWorkItem } = await import('../../src/api-client');

    await createCommand({
      project: 'MyProject',
      type: 'Bug',
      title: 'Login timeout',
      priority: '1',
    });

    expect(createWorkItem).toHaveBeenCalledWith(
      'Bug',
      expect.any(Array),
      'MyProject'
    );
  });

  it('adds parent link when --parent-id is specified', async () => {
    const { createWorkItem } = await import('../../src/api-client');

    await createCommand({
      project: 'MyProject',
      type: 'Task',
      title: 'Subtask',
      parentId: '42',
    });

    const ops = (createWorkItem as ReturnType<typeof vi.fn>).mock.calls[0][1];
    const parentOp = ops.find((op: { path: string }) => op.path === '/relations/-');
    expect(parentOp).toBeDefined();
    expect(parentOp.value.rel).toBe('System.LinkTypes.Hierarchy-Reverse');
    expect(parentOp.value.url).toContain('42');
  });
});
