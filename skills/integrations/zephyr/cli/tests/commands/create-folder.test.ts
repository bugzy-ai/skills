import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createFolder } from '../../src/commands/create-folder';
import { mockOk } from '../mock-response';

describe('create-folder', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, ZEPHYR_API_TOKEN: 'test-token' };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('throws if --project is missing', async () => {
    await expect(createFolder({ project: '', name: 'F1', type: 'TEST_CASE' })).rejects.toThrow(
      '--project is required'
    );
  });

  it('throws if --name is missing', async () => {
    await expect(createFolder({ project: 'PROJ', name: '', type: 'TEST_CASE' })).rejects.toThrow(
      '--name is required'
    );
  });

  it('throws if --type is missing', async () => {
    await expect(createFolder({ project: 'PROJ', name: 'F1', type: '' })).rejects.toThrow(
      '--type is required'
    );
  });

  it('throws on invalid folder type', async () => {
    await expect(
      createFolder({ project: 'PROJ', name: 'F1', type: 'INVALID' })
    ).rejects.toThrow('Invalid folder type');
  });

  it('creates a folder and outputs JSON', async () => {
    const folder = { id: 123, name: 'Generated Tests', folderType: 'TEST_CASE' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockOk(folder)));
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await createFolder({ project: 'PROJ', name: 'Generated Tests', type: 'TEST_CASE' });

    expect(writeSpy).toHaveBeenCalledWith(JSON.stringify(folder, null, 2));
  });

  it('sends correct body to API', async () => {
    const mockFetch = vi.fn().mockResolvedValue(mockOk({ id: 123 }));
    vi.stubGlobal('fetch', mockFetch);
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await createFolder({ project: 'PROJ', name: 'My Folder', type: 'TEST_CYCLE' });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.projectKey).toBe('PROJ');
    expect(body.name).toBe('My Folder');
    expect(body.folderType).toBe('TEST_CYCLE');
  });
});
