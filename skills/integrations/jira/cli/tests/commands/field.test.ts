import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/jira-client', () => ({
  request: vi.fn(),
}));

import { request } from '../../src/jira-client';
import { listFields } from '../../src/commands/field';

const mockedRequest = vi.mocked(request);

describe('field commands', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('lists fields', async () => {
    const fields = [
      { id: 'summary', name: 'Summary', schema: { type: 'string' } },
      { id: 'customfield_10001', name: 'Story Points', schema: { type: 'number' } },
    ];
    mockedRequest.mockResolvedValue(fields);

    await listFields();

    expect(mockedRequest).toHaveBeenCalledWith('GET', '/field');
    expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(fields));
  });
});
