import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/notion-client', () => ({
  request: vi.fn(),
  getToken: vi.fn().mockReturnValue('test-token'),
  extractPlainText: vi.fn().mockReturnValue('Page content here'),
}));

import { request, extractPlainText } from '../../src/notion-client';
import { getPage, createPage, updatePage } from '../../src/commands/page';

const mockRequest = vi.mocked(request);
const mockExtract = vi.mocked(extractPlainText);
let mockLog: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  mockRequest.mockReset();
  mockExtract.mockReset().mockReturnValue('Page content here');
  mockLog = vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getPage', () => {
  it('fetches page and blocks, outputs combined JSON', async () => {
    mockRequest
      .mockResolvedValueOnce({
        id: 'page-1',
        url: 'https://notion.so/page-1',
        created_time: '2026-01-01T00:00:00Z',
        last_edited_time: '2026-01-02T00:00:00Z',
        properties: { Name: { title: [{ plain_text: 'Test' }] } },
      })
      .mockResolvedValueOnce({
        results: [{ id: 'block-1', type: 'paragraph', paragraph: { rich_text: [{ plain_text: 'Hello' }] } }],
        has_more: false,
        next_cursor: null,
      });

    await getPage('page-1');

    expect(mockRequest).toHaveBeenCalledWith('GET', '/v1/pages/page-1');
    expect(mockRequest).toHaveBeenCalledWith('GET', '/v1/blocks/page-1/children');

    const output = JSON.parse(mockLog.mock.calls[0][0] as string);
    expect(output.id).toBe('page-1');
    expect(output.content).toBe('Page content here');
  });

  it('throws when page ID is missing', async () => {
    await expect(getPage('')).rejects.toThrow('Page ID is required');
  });
});

describe('createPage', () => {
  it('creates page with title in database', async () => {
    mockRequest.mockResolvedValue({
      id: 'new-page-1',
      url: 'https://notion.so/new-page-1',
      properties: { Name: { title: [{ plain_text: 'Bug Report' }] } },
    });

    await createPage('db-1', 'Bug Report');

    expect(mockRequest).toHaveBeenCalledWith('POST', '/v1/pages', {
      parent: { database_id: 'db-1' },
      properties: {
        Name: { title: [{ text: { content: 'Bug Report' } }] },
      },
    });
  });

  it('merges extra properties when provided', async () => {
    mockRequest.mockResolvedValue({ id: 'p1', url: 'u', properties: {} });

    await createPage('db-1', 'Issue', '{"Status":{"select":{"name":"Open"}}}');

    const body = mockRequest.mock.calls[0][2] as Record<string, unknown>;
    const props = (body as { properties: Record<string, unknown> }).properties;
    expect(props).toHaveProperty('Status', { select: { name: 'Open' } });
    expect(props).toHaveProperty('Name');
  });

  it('throws on invalid properties JSON', async () => {
    await expect(createPage('db-1', 'Title', '{bad json}')).rejects.toThrow('Invalid JSON for --properties');
  });

  it('throws when parent is missing', async () => {
    await expect(createPage('', 'Title')).rejects.toThrow('Parent database ID is required');
  });

  it('throws when title is missing', async () => {
    await expect(createPage('db-1', '')).rejects.toThrow('Title is required');
  });
});

describe('updatePage', () => {
  it('patches page properties', async () => {
    mockRequest.mockResolvedValue({
      id: 'page-1',
      url: 'https://notion.so/page-1',
      properties: { Status: { select: { name: 'Done' } } },
    });

    await updatePage('page-1', '{"Status":{"select":{"name":"Done"}}}');

    expect(mockRequest).toHaveBeenCalledWith('PATCH', '/v1/pages/page-1', {
      properties: { Status: { select: { name: 'Done' } } },
    });
  });

  it('outputs updated page as JSON', async () => {
    mockRequest.mockResolvedValue({ id: 'page-1', url: 'u', properties: {} });

    await updatePage('page-1', '{"Priority":{"select":{"name":"High"}}}');

    const output = JSON.parse(mockLog.mock.calls[0][0] as string);
    expect(output.id).toBe('page-1');
  });

  it('throws when page ID is missing', async () => {
    await expect(updatePage('', '{"a":1}')).rejects.toThrow('Page ID is required');
  });

  it('throws when properties are missing', async () => {
    await expect(updatePage('page-1', '')).rejects.toThrow('Properties JSON is required');
  });

  it('throws on invalid properties JSON', async () => {
    await expect(updatePage('page-1', '{bad}')).rejects.toThrow('Invalid JSON for --properties');
  });
});
