import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/notion-client', () => ({
  request: vi.fn(),
  getToken: vi.fn().mockReturnValue('test-token'),
}));

import { request } from '../../src/notion-client';
import { search } from '../../src/commands/search';

const mockRequest = vi.mocked(request);
let mockLog: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  mockRequest.mockReset();
  mockLog = vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('search', () => {
  it('posts to /v1/search with query', async () => {
    mockRequest.mockResolvedValue({
      results: [{ id: 'page-1', object: 'page' }],
      has_more: false,
      next_cursor: null,
    });

    await search('test query');

    expect(mockRequest).toHaveBeenCalledWith('POST', '/v1/search', {
      query: 'test query',
      page_size: 25,
    });
  });

  it('applies page filter', async () => {
    mockRequest.mockResolvedValue({ results: [], has_more: false, next_cursor: null });

    await search('docs', 'page');

    expect(mockRequest).toHaveBeenCalledWith('POST', '/v1/search', {
      query: 'docs',
      page_size: 25,
      filter: { value: 'page', property: 'object' },
    });
  });

  it('applies database filter', async () => {
    mockRequest.mockResolvedValue({ results: [], has_more: false, next_cursor: null });

    await search('tracker', 'database');

    expect(mockRequest).toHaveBeenCalledWith('POST', '/v1/search', {
      query: 'tracker',
      page_size: 25,
      filter: { value: 'database', property: 'object' },
    });
  });

  it('respects limit option', async () => {
    mockRequest.mockResolvedValue({ results: [], has_more: false, next_cursor: null });

    await search('test', undefined, '10');

    expect(mockRequest).toHaveBeenCalledWith('POST', '/v1/search', {
      query: 'test',
      page_size: 10,
    });
  });

  it('outputs JSON to stdout', async () => {
    mockRequest.mockResolvedValue({
      results: [{ id: 'page-1' }],
      has_more: true,
      next_cursor: 'cursor-abc',
    });

    await search('query');

    const output = JSON.parse(mockLog.mock.calls[0][0] as string);
    expect(output.results).toEqual([{ id: 'page-1' }]);
    expect(output.has_more).toBe(true);
    expect(output.next_cursor).toBe('cursor-abc');
  });

  it('throws when query is empty', async () => {
    await expect(search('')).rejects.toThrow('Search query is required');
  });
});
