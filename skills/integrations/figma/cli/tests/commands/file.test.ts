import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getFile, getFileMeta, getNodes } from '../../src/commands/file';

const ENV_BACKUP = { ...process.env };
const mockFetchFn = vi.fn();

beforeEach(() => {
  process.env.FIGMA_ACCESS_TOKEN = 'test-token';
  mockFetchFn.mockReset();
  vi.stubGlobal('fetch', mockFetchFn);
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  process.env = { ...ENV_BACKUP };
  vi.restoreAllMocks();
});

function mockResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'OK',
    text: () => Promise.resolve(JSON.stringify(data)),
    json: () => Promise.resolve(data),
    headers: new Headers(),
  } as Response;
}

describe('getFile', () => {
  it('outputs file metadata and pages', async () => {
    mockFetchFn.mockResolvedValue(
      mockResponse({
        name: 'Design System',
        lastModified: '2026-01-15T10:00:00Z',
        version: '12345',
        role: 'owner',
        editorType: 'figma',
        document: {
          id: '0:0',
          name: 'Document',
          type: 'DOCUMENT',
          children: [
            { id: '1:1', name: 'Page 1', type: 'CANVAS', children: [{ id: '2:1', name: 'Frame', type: 'FRAME' }] },
            { id: '1:2', name: 'Page 2', type: 'CANVAS', children: [] },
          ],
        },
      })
    );

    await getFile('abc123');

    const output = JSON.parse((console.log as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(output.name).toBe('Design System');
    expect(output.lastModified).toBe('2026-01-15T10:00:00Z');
    expect(output.pages).toHaveLength(2);
    expect(output.pages[0]).toEqual({ id: '1:1', name: 'Page 1', type: 'CANVAS', childCount: 1 });
    expect(output.pages[1]).toEqual({ id: '1:2', name: 'Page 2', type: 'CANVAS', childCount: 0 });
  });

  it('passes depth parameter', async () => {
    mockFetchFn.mockResolvedValue(
      mockResponse({
        name: 'File', lastModified: '', version: '1', role: 'viewer', editorType: 'figma',
        document: { id: '0:0', name: 'Document', type: 'DOCUMENT', children: [] },
      })
    );

    await getFile('abc123', '2');

    const url = mockFetchFn.mock.calls[0][0] as string;
    expect(url).toContain('depth=2');
  });

  it('throws if file key is missing', async () => {
    await expect(getFile('')).rejects.toThrow('File key is required');
  });
});

describe('getFileMeta', () => {
  it('outputs lightweight metadata with page count', async () => {
    mockFetchFn.mockResolvedValue(
      mockResponse({
        name: 'My Design',
        lastModified: '2026-02-01T12:00:00Z',
        version: '999',
        role: 'editor',
        editorType: 'figma',
        document: {
          id: '0:0',
          name: 'Document',
          type: 'DOCUMENT',
          children: [
            { id: '1:1', name: 'Home', type: 'CANVAS' },
            { id: '1:2', name: 'Components', type: 'CANVAS' },
            { id: '1:3', name: 'Tokens', type: 'CANVAS' },
          ],
        },
      })
    );

    await getFileMeta('abc123');

    const output = JSON.parse((console.log as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(output.name).toBe('My Design');
    expect(output.pageCount).toBe(3);
    expect(output.pageNames).toEqual(['Home', 'Components', 'Tokens']);
  });

  it('uses depth=1 for lightweight fetch', async () => {
    mockFetchFn.mockResolvedValue(
      mockResponse({
        name: 'File', lastModified: '', version: '1', role: 'viewer', editorType: 'figma',
        document: { id: '0:0', name: 'Document', type: 'DOCUMENT', children: [] },
      })
    );

    await getFileMeta('abc123');

    const url = mockFetchFn.mock.calls[0][0] as string;
    expect(url).toContain('depth=1');
  });

  it('throws if file key is missing', async () => {
    await expect(getFileMeta('')).rejects.toThrow('File key is required');
  });
});

describe('getNodes', () => {
  it('outputs node details by ID', async () => {
    mockFetchFn.mockResolvedValue(
      mockResponse({
        name: 'File',
        lastModified: '',
        nodes: {
          '1:2': {
            document: {
              id: '1:2',
              name: 'Button',
              type: 'COMPONENT',
              children: [
                { id: '3:1', name: 'Label', type: 'TEXT' },
                { id: '3:2', name: 'Icon', type: 'VECTOR' },
              ],
            },
            components: {},
          },
        },
      })
    );

    await getNodes('abc123', '1:2');

    const output = JSON.parse((console.log as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(output).toHaveLength(1);
    expect(output[0].id).toBe('1:2');
    expect(output[0].name).toBe('Button');
    expect(output[0].children).toHaveLength(2);
  });

  it('throws if file key is missing', async () => {
    await expect(getNodes('', '1:2')).rejects.toThrow('File key is required');
  });

  it('throws if ids are missing', async () => {
    await expect(getNodes('abc123', '')).rejects.toThrow('Node IDs are required');
  });

  it('passes ids and depth as query params', async () => {
    mockFetchFn.mockResolvedValue(
      mockResponse({
        name: 'File', lastModified: '', nodes: {},
      })
    );

    await getNodes('abc123', '1:2,3:4', '1');

    const url = mockFetchFn.mock.calls[0][0] as string;
    expect(url).toContain('/nodes');
    expect(url).toContain('ids=');
    expect(url).toContain('depth=1');
  });
});
