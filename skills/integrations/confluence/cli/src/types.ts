/**
 * Confluence Cloud REST API response types
 * All operations go through v1 search endpoint with CQL + expand
 */

/** v1 search result - base shape */
export interface ConfluenceSearchResult {
  content: {
    id: string;
    type: string;
    status: string;
    title: string;
    space?: {
      id: number;
      key: string;
      name: string;
      type: string;
      status: string;
    };
    version?: { number: number; createdAt?: string };
    body?: { storage?: { value: string; representation?: string } };
    metadata?: {
      labels?: {
        results: { id: string; name: string; prefix?: string }[];
      };
    };
    _links?: { webui?: string };
  };
  resultGlobalContainer?: {
    title: string;
    displayUrl?: string;
  };
  /** v1 search for type=space returns a `space` field */
  space?: {
    id: number;
    key: string;
    name: string;
    type: string;
    status: string;
  };
  url: string;
  excerpt?: string;
}

/** v1 search response */
export interface ConfluenceSearchResponse {
  results: ConfluenceSearchResult[];
  start: number;
  limit: number;
  size: number;
  totalSize?: number;
  _links?: { next?: string };
}
