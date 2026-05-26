import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { listComponents, getComponent, listComponentSets } from '../../src/commands/component';

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

describe('listComponents', () => {
  it('outputs component list from file', async () => {
    mockFetchFn.mockResolvedValue(
      mockResponse({
        meta: {
          components: [
            {
              key: 'comp1', name: 'Button', description: 'Primary button', node_id: '1:2',
              containing_frame: { name: 'Components', nodeId: '0:1', pageName: 'Library' },
              file_key: 'abc', thumbnail_url: '', created_at: '', updated_at: '',
            },
            {
              key: 'comp2', name: 'Input', description: 'Text input', node_id: '1:3',
              containing_frame: { name: 'Components', nodeId: '0:1', pageName: 'Library' },
              file_key: 'abc', thumbnail_url: '', created_at: '', updated_at: '',
            },
          ],
        },
      })
    );

    await listComponents('abc123');

    const output = JSON.parse((console.log as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(output).toHaveLength(2);
    expect(output[0]).toEqual({
      key: 'comp1', name: 'Button', description: 'Primary button',
      nodeId: '1:2', containingFrame: 'Components', pageName: 'Library',
    });
  });

  it('handles empty component list', async () => {
    mockFetchFn.mockResolvedValue(
      mockResponse({ meta: { components: [] } })
    );

    await listComponents('abc123');

    const output = JSON.parse((console.log as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(output).toEqual([]);
  });

  it('throws if file key is missing', async () => {
    await expect(listComponents('')).rejects.toThrow('File key is required');
  });

  it('calls correct endpoint', async () => {
    mockFetchFn.mockResolvedValue(mockResponse({ meta: { components: [] } }));

    await listComponents('abc123');

    const url = mockFetchFn.mock.calls[0][0] as string;
    expect(url).toContain('/files/abc123/components');
  });
});

describe('getComponent', () => {
  it('outputs single component details', async () => {
    mockFetchFn.mockResolvedValue(
      mockResponse({
        meta: {
          key: 'comp1', file_key: 'abc', name: 'Button', description: 'A button',
          node_id: '1:2', thumbnail_url: 'https://example.com/thumb.png',
          created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-15T00:00:00Z',
          containing_frame: { name: 'Buttons', nodeId: '0:1', pageName: 'Components' },
        },
      })
    );

    await getComponent('comp1');

    const output = JSON.parse((console.log as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(output.key).toBe('comp1');
    expect(output.fileKey).toBe('abc');
    expect(output.name).toBe('Button');
    expect(output.containingFrame).toBe('Buttons');
    expect(output.pageName).toBe('Components');
  });

  it('throws if component key is missing', async () => {
    await expect(getComponent('')).rejects.toThrow('Component key is required');
  });

  it('calls correct endpoint', async () => {
    mockFetchFn.mockResolvedValue(
      mockResponse({
        meta: {
          key: 'comp1', file_key: 'abc', name: 'X', description: '',
          node_id: '1:1', thumbnail_url: '', created_at: '', updated_at: '',
        },
      })
    );

    await getComponent('comp1');

    const url = mockFetchFn.mock.calls[0][0] as string;
    expect(url).toContain('/components/comp1');
  });
});

describe('listComponentSets', () => {
  it('outputs component sets from file', async () => {
    mockFetchFn.mockResolvedValue(
      mockResponse({
        meta: {
          component_sets: [
            { key: 'set1', name: 'Button Variants', description: 'Primary/Secondary', node_id: '1:5', file_key: 'abc' },
          ],
        },
      })
    );

    await listComponentSets('abc123');

    const output = JSON.parse((console.log as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(output).toHaveLength(1);
    expect(output[0]).toEqual({
      key: 'set1', name: 'Button Variants', description: 'Primary/Secondary', nodeId: '1:5',
    });
  });

  it('handles empty sets', async () => {
    mockFetchFn.mockResolvedValue(mockResponse({ meta: { component_sets: [] } }));

    await listComponentSets('abc123');

    const output = JSON.parse((console.log as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(output).toEqual([]);
  });

  it('throws if file key is missing', async () => {
    await expect(listComponentSets('')).rejects.toThrow('File key is required');
  });
});
