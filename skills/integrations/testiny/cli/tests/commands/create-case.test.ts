import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createCase } from '../../src/commands/create-case';
import { mockOk } from '../mock-response';

describe('create-case', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, TESTINY_API_KEY: 'test-key', TESTINY_PROJECT_ID: '1' };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('throws if --name is missing', async () => {
    await expect(createCase({ name: '' })).rejects.toThrow('--name is required');
  });

  it('throws if neither --project nor TESTINY_PROJECT_ID is set', async () => {
    delete process.env.TESTINY_PROJECT_ID;
    await expect(createCase({ name: 'Test' })).rejects.toThrow(
      '--project or TESTINY_PROJECT_ID env is required'
    );
  });

  it('throws on non-numeric --project', async () => {
    await expect(createCase({ name: 'Test', project: 'PROJ' })).rejects.toThrow(
      '--project must be a numeric id'
    );
  });

  it('rejects unknown --template', async () => {
    await expect(createCase({ name: 'Test', template: 'WIKI' })).rejects.toThrow(
      '--template must be STEPS or TEXT'
    );
  });

  it('creates a case with default STEPS template and outputs id', async () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(mockOk({ id: 42, title: 'My Test', template: 'STEPS' }))
    );

    await createCase({ name: 'My Test' });

    const output = JSON.parse(writeSpy.mock.calls[0][0] as string);
    expect(output.id).toBe(42);
  });

  it('uses TESTINY_PROJECT_ID env when --project omitted', async () => {
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const mockFetch = vi
      .fn()
      .mockResolvedValue(mockOk({ id: 1, title: 'T', template: 'STEPS' }));
    vi.stubGlobal('fetch', mockFetch);

    await createCase({ name: 'T' });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.project_id).toBe(1);
  });

  it('routes --steps into steps_text under STEPS template', async () => {
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const mockFetch = vi
      .fn()
      .mockResolvedValue(mockOk({ id: 1, title: 'T', template: 'STEPS' }));
    vi.stubGlobal('fetch', mockFetch);

    await createCase({
      name: 'T',
      steps: 'Step 1: open\nStep 2: click',
      precondition: 'Logged in',
      expected: 'Success',
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.template).toBe('STEPS');
    expect(body.steps_text).toBe('Step 1: open\nStep 2: click');
    expect(body.precondition_text).toBe('Logged in');
    expect(body.expected_result_text).toBe('Success');
    expect(body.content_text).toBeUndefined();
  });

  it('routes --content into content_text under TEXT template', async () => {
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const mockFetch = vi
      .fn()
      .mockResolvedValue(mockOk({ id: 1, title: 'T', template: 'TEXT' }));
    vi.stubGlobal('fetch', mockFetch);

    await createCase({ name: 'T', template: 'TEXT', content: '# Scenario\nmarkdown' });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.template).toBe('TEXT');
    expect(body.content_text).toBe('# Scenario\nmarkdown');
    expect(body.steps_text).toBeUndefined();
  });

  it('ignores --content under STEPS template (mismatched flag is silently dropped)', async () => {
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const mockFetch = vi
      .fn()
      .mockResolvedValue(mockOk({ id: 1, title: 'T', template: 'STEPS' }));
    vi.stubGlobal('fetch', mockFetch);

    await createCase({ name: 'T', steps: 'do thing', content: 'ignored' });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.steps_text).toBe('do thing');
    expect(body.content_text).toBeUndefined();
  });

  it('posts to /testcase (singular path)', async () => {
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const mockFetch = vi
      .fn()
      .mockResolvedValue(mockOk({ id: 1, title: 'T', template: 'STEPS' }));
    vi.stubGlobal('fetch', mockFetch);

    await createCase({ name: 'T' });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe('https://app.testiny.io/api/v1/testcase');
  });
});
