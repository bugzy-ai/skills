import { describe, it, expect, vi, afterEach } from 'vitest';
import { searchCommand } from '../../src/commands/search';

vi.mock('../../src/api-client', () => ({
  searchWorkItems: vi.fn().mockResolvedValue({
    queryResult: { workItems: [] },
    workItems: [],
  }),
}));

describe('searchCommand', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws when --project is missing', async () => {
    await expect(searchCommand({ project: '' })).rejects.toThrow('--project is required');
  });

  it('passes WIQL query through when starting with SELECT', async () => {
    const { searchWorkItems } = await import('../../src/api-client');
    const rawWiql = "SELECT [System.Id] FROM WorkItems WHERE [System.State] = 'Active'";

    await searchCommand({ project: 'MyProject', query: rawWiql });

    expect(searchWorkItems).toHaveBeenCalledWith(
      rawWiql,
      'MyProject',
      expect.objectContaining({ top: 50 })
    );
  });

  it('auto-generates WIQL from text query', async () => {
    const { searchWorkItems } = await import('../../src/api-client');

    await searchCommand({ project: 'MyProject', query: 'login bug' });

    expect(searchWorkItems).toHaveBeenCalledWith(
      expect.stringContaining("CONTAINS 'login bug'"),
      'MyProject',
      expect.anything()
    );
  });

  it('applies type filter', async () => {
    const { searchWorkItems } = await import('../../src/api-client');

    await searchCommand({ project: 'MyProject', query: 'test', type: 'Bug' });

    const calledWiql = (searchWorkItems as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledWiql).toContain("[System.WorkItemType] = 'Bug'");
  });

  it('applies state filter', async () => {
    const { searchWorkItems } = await import('../../src/api-client');

    await searchCommand({ project: 'MyProject', query: 'test', state: 'Active' });

    const calledWiql = (searchWorkItems as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledWiql).toContain("[System.State] = 'Active'");
  });

  it('applies area-path filter with UNDER', async () => {
    const { searchWorkItems } = await import('../../src/api-client');

    await searchCommand({ project: 'MyProject', query: 'test', areaPath: 'MyProject\\QA' });

    const calledWiql = (searchWorkItems as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledWiql).toContain("[System.AreaPath] UNDER 'MyProject\\QA'");
  });

  it('uses custom --top limit', async () => {
    const { searchWorkItems } = await import('../../src/api-client');

    await searchCommand({ project: 'MyProject', query: 'test', top: '10' });

    expect(searchWorkItems).toHaveBeenCalledWith(
      expect.anything(),
      'MyProject',
      expect.objectContaining({ top: 10 })
    );
  });

  it('escapes single quotes in query', async () => {
    const { searchWorkItems } = await import('../../src/api-client');

    await searchCommand({ project: 'MyProject', query: "can't login" });

    const calledWiql = (searchWorkItems as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledWiql).toContain("can''t login");
  });
});

// Need beforeEach import
import { beforeEach } from 'vitest';
