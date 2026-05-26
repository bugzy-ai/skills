import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportImages } from '../../src/commands/image';

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

describe('exportImages', () => {
  it('outputs image export URLs', async () => {
    mockFetchFn.mockResolvedValue(
      mockResponse({
        err: null,
        images: {
          '1:2': 'https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/abc',
          '3:4': 'https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/def',
        },
      })
    );

    await exportImages('abc123', '1:2,3:4');

    const output = JSON.parse((console.log as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(output).toHaveLength(2);
    expect(output[0].nodeId).toBe('1:2');
    expect(output[0].url).toContain('figma-alpha-api');
    expect(output[1].nodeId).toBe('3:4');
  });

  it('handles null image URLs (node not found)', async () => {
    mockFetchFn.mockResolvedValue(
      mockResponse({
        err: null,
        images: { '1:2': null },
      })
    );

    await exportImages('abc123', '1:2');

    const output = JSON.parse((console.log as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(output[0].url).toBeNull();
  });

  it('passes scale and format params', async () => {
    mockFetchFn.mockResolvedValue(
      mockResponse({ err: null, images: { '1:2': 'https://example.com/img' } })
    );

    await exportImages('abc123', '1:2', '2', 'svg');

    const url = mockFetchFn.mock.calls[0][0] as string;
    expect(url).toContain('scale=2');
    expect(url).toContain('format=svg');
  });

  it('throws if file key is missing', async () => {
    await expect(exportImages('', '1:2')).rejects.toThrow('File key is required');
  });

  it('throws if ids are missing', async () => {
    await expect(exportImages('abc123', '')).rejects.toThrow('Node IDs are required');
  });

  it('throws on Figma export error', async () => {
    mockFetchFn.mockResolvedValue(
      mockResponse({ err: 'Cannot render node', images: {} })
    );

    await expect(exportImages('abc123', '1:2')).rejects.toThrow('Figma image export error');
  });

  it('calls correct endpoint', async () => {
    mockFetchFn.mockResolvedValue(
      mockResponse({ err: null, images: {} })
    );

    await exportImages('abc123', '1:2');

    const url = mockFetchFn.mock.calls[0][0] as string;
    expect(url).toContain('/images/abc123');
  });
});
