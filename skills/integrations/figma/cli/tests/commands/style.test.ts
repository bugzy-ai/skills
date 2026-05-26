import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { listStyles, getStyle } from '../../src/commands/style';

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

describe('listStyles', () => {
  it('outputs styles from file', async () => {
    mockFetchFn.mockResolvedValue(
      mockResponse({
        meta: {
          styles: [
            { key: 's1', name: 'Primary', style_type: 'FILL', description: 'Brand primary', node_id: '1:1', file_key: 'abc', thumbnail_url: '' },
            { key: 's2', name: 'Heading 1', style_type: 'TEXT', description: 'Main heading', node_id: '1:2', file_key: 'abc', thumbnail_url: '' },
          ],
        },
      })
    );

    await listStyles('abc123');

    const output = JSON.parse((console.log as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(output).toHaveLength(2);
    expect(output[0]).toEqual({
      key: 's1', name: 'Primary', styleType: 'FILL', description: 'Brand primary', nodeId: '1:1',
    });
    expect(output[1]).toEqual({
      key: 's2', name: 'Heading 1', styleType: 'TEXT', description: 'Main heading', nodeId: '1:2',
    });
  });

  it('handles empty styles', async () => {
    mockFetchFn.mockResolvedValue(mockResponse({ meta: { styles: [] } }));

    await listStyles('abc123');

    const output = JSON.parse((console.log as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(output).toEqual([]);
  });

  it('throws if file key is missing', async () => {
    await expect(listStyles('')).rejects.toThrow('File key is required');
  });

  it('calls correct endpoint', async () => {
    mockFetchFn.mockResolvedValue(mockResponse({ meta: { styles: [] } }));

    await listStyles('abc123');

    const url = mockFetchFn.mock.calls[0][0] as string;
    expect(url).toContain('/files/abc123/styles');
  });
});

describe('getStyle', () => {
  it('outputs single style details', async () => {
    mockFetchFn.mockResolvedValue(
      mockResponse({
        meta: {
          key: 's1', file_key: 'abc', name: 'Primary Blue', style_type: 'FILL',
          description: 'Main brand color', node_id: '1:5', thumbnail_url: 'https://example.com/thumb.png',
        },
      })
    );

    await getStyle('s1');

    const output = JSON.parse((console.log as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(output.key).toBe('s1');
    expect(output.fileKey).toBe('abc');
    expect(output.name).toBe('Primary Blue');
    expect(output.styleType).toBe('FILL');
    expect(output.description).toBe('Main brand color');
    expect(output.thumbnailUrl).toBe('https://example.com/thumb.png');
  });

  it('throws if style key is missing', async () => {
    await expect(getStyle('')).rejects.toThrow('Style key is required');
  });

  it('calls correct endpoint', async () => {
    mockFetchFn.mockResolvedValue(
      mockResponse({
        meta: {
          key: 's1', file_key: 'abc', name: 'X', style_type: 'FILL',
          description: '', node_id: '1:1', thumbnail_url: '',
        },
      })
    );

    await getStyle('s1');

    const url = mockFetchFn.mock.calls[0][0] as string;
    expect(url).toContain('/styles/s1');
  });
});
