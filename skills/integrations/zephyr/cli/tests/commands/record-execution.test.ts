import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { recordExecution } from '../../src/commands/record-execution';
import { mockOk } from '../mock-response';

describe('record-execution', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, ZEPHYR_API_TOKEN: 'test-token' };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('requires release and revision explicitly', async () => {
    await expect(recordExecution({
      project: 'PROJ', testCase: 'PROJ-T1', testCycle: 'PROJ-R1', status: 'Pass', release: '', revision: 'abc123',
    })).rejects.toThrow('--release is required');
    await expect(recordExecution({
      project: 'PROJ', testCase: 'PROJ-T1', testCycle: 'PROJ-R1', status: 'Pass', release: '1.0.0', revision: '',
    })).rejects.toThrow('--revision is required');
  });

  it('records release and revision in the execution comment', async () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const mockFetch = vi.fn().mockResolvedValue(mockOk({}));
    vi.stubGlobal('fetch', mockFetch);

    await recordExecution({
      project: 'PROJ',
      testCase: 'PROJ-T1',
      testCycle: 'PROJ-R1',
      status: 'Pass',
      release: '1.0.0',
      revision: 'abc123',
      comment: 'Smoke passed',
      environment: 'QA',
    });

    expect(mockFetch.mock.calls[0][0]).toContain('/testexecutions');
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toMatchObject({
      projectKey: 'PROJ',
      testCaseKey: 'PROJ-T1',
      testCycleKey: 'PROJ-R1',
      statusName: 'Pass',
      environmentName: 'QA',
    });
    expect(body.comment).toContain('Platform release: 1.0.0');
    expect(body.comment).toContain('Platform revision: abc123');
    expect(body.comment).toContain('Smoke passed');
    expect(JSON.parse(writeSpy.mock.calls[0][0] as string)).toEqual({ recorded: true });
  });

  it('rejects invalid execution time before sending the request', async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    await expect(recordExecution({
      project: 'PROJ',
      testCase: 'PROJ-T1',
      testCycle: 'PROJ-R1',
      status: 'Pass',
      release: '1.0.0',
      revision: 'abc123',
      executionTime: 'abc',
    })).rejects.toThrow('--execution-time must be a non-negative integer');
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
