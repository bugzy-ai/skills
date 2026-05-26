import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/notion-client', () => ({
  request: vi.fn(),
  getToken: vi.fn().mockReturnValue('test-token'),
}));

import { request } from '../../src/notion-client';
import { getDatabase, queryDatabase } from '../../src/commands/database';

const mockRequest = vi.mocked(request);
let mockLog: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  mockRequest.mockReset();
  mockLog = vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getDatabase', () => {
  it('fetches database schema', async () => {
    mockRequest.mockResolvedValue({
      id: 'db-1',
      url: 'https://notion.so/db-1',
      title: [{ plain_text: 'Issue Tracker' }],
      properties: { Status: { type: 'select' }, Priority: { type: 'select' } },
    });

    await getDatabase('db-1');

    expect(mockRequest).toHaveBeenCalledWith('GET', '/v1/databases/db-1');

    const output = JSON.parse(mockLog.mock.calls[0][0] as string);
    expect(output.id).toBe('db-1');
    expect(output.properties).toHaveProperty('Status');
    expect(output.title).toEqual([{ plain_text: 'Issue Tracker' }]);
  });

  it('throws when database ID is missing', async () => {
    await expect(getDatabase('')).rejects.toThrow('Database ID is required');
  });
});

describe('queryDatabase', () => {
  it('queries database with default page size', async () => {
    mockRequest.mockResolvedValue({
      results: [{ id: 'row-1' }],
      has_more: false,
      next_cursor: null,
    });

    await queryDatabase('db-1');

    expect(mockRequest).toHaveBeenCalledWith('POST', '/v1/databases/db-1/query', {
      page_size: 25,
    });
  });

  it('applies filter when provided', async () => {
    mockRequest.mockResolvedValue({ results: [], has_more: false, next_cursor: null });

    await queryDatabase('db-1', '{"property":"Status","select":{"equals":"Open"}}');

    expect(mockRequest).toHaveBeenCalledWith('POST', '/v1/databases/db-1/query', {
      page_size: 25,
      filter: { property: 'Status', select: { equals: 'Open' } },
    });
  });

  it('respects limit option', async () => {
    mockRequest.mockResolvedValue({ results: [], has_more: false, next_cursor: null });

    await queryDatabase('db-1', undefined, '5');

    expect(mockRequest).toHaveBeenCalledWith('POST', '/v1/databases/db-1/query', {
      page_size: 5,
    });
  });

  it('outputs results with pagination metadata', async () => {
    mockRequest.mockResolvedValue({
      results: [{ id: 'row-1' }, { id: 'row-2' }],
      has_more: true,
      next_cursor: 'cursor-xyz',
    });

    await queryDatabase('db-1');

    const output = JSON.parse(mockLog.mock.calls[0][0] as string);
    expect(output.results).toHaveLength(2);
    expect(output.has_more).toBe(true);
    expect(output.next_cursor).toBe('cursor-xyz');
  });

  it('throws when database ID is missing', async () => {
    await expect(queryDatabase('')).rejects.toThrow('Database ID is required');
  });

  it('throws on invalid filter JSON', async () => {
    await expect(queryDatabase('db-1', '{bad json}')).rejects.toThrow('Invalid JSON for --filter');
  });
});
