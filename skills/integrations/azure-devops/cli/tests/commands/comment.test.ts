import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { commentCommand } from '../../src/commands/comment';

vi.mock('../../src/api-client', () => ({
  addComment: vi.fn().mockResolvedValue({
    id: 1,
    workItemId: 42,
    text: 'QA verified',
    version: 1,
  }),
}));

describe('commentCommand', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws when ID is missing', async () => {
    await expect(commentCommand('', { project: 'MyProject', body: 'Test' })).rejects.toThrow(
      'ID is required'
    );
  });

  it('throws when --project is missing', async () => {
    await expect(commentCommand('42', { project: '', body: 'Test' })).rejects.toThrow(
      '--project is required'
    );
  });

  it('throws when --body is missing', async () => {
    await expect(commentCommand('42', { project: 'MyProject', body: '' })).rejects.toThrow(
      '--body is required'
    );
  });

  it('calls addComment with correct params', async () => {
    const { addComment } = await import('../../src/api-client');

    await commentCommand('42', { project: 'MyProject', body: '<b>QA verified</b>' });

    expect(addComment).toHaveBeenCalledWith(42, '<b>QA verified</b>', 'MyProject');
  });
});
