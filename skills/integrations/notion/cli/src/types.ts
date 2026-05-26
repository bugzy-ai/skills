/**
 * Notion REST API response types
 * Covers pages, databases, blocks, and search results
 */

/** Rich text element in Notion */
export interface RichText {
  plain_text: string;
  href?: string | null;
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    strikethrough?: boolean;
    underline?: boolean;
    code?: boolean;
  };
}

/** Notion block (paragraph, heading, list item, etc.) */
export interface NotionBlock {
  id: string;
  type: string;
  [key: string]: unknown;
}

/** Notion page object */
export interface NotionPage {
  id: string;
  url: string;
  created_time: string;
  last_edited_time: string;
  parent: Record<string, unknown>;
  properties: Record<string, unknown>;
}

/** Notion database object (schema) */
export interface NotionDatabase {
  id: string;
  url: string;
  title: RichText[];
  properties: Record<string, unknown>;
}

/** Paginated list response (search, query) */
export interface NotionListResponse {
  results: unknown[];
  has_more: boolean;
  next_cursor: string | null;
}

/** Block children response */
export interface NotionBlockChildren {
  results: NotionBlock[];
  has_more: boolean;
  next_cursor: string | null;
}
