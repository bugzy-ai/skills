/**
 * Confluence Cloud API client
 * Uses native fetch() with OAuth Bearer authentication
 * All operations go through the v1 search endpoint (CQL + expand)
 * This requires only the `search:confluence` OAuth scope
 * Single retry on 429 with Retry-After header (borrowed from Asana CLI)
 */

const MAX_RETRIES = 1;

/**
 * Get and validate the Confluence access token from environment
 */
export function getToken(): string {
  const token = process.env.CONFLUENCE_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      'CONFLUENCE_ACCESS_TOKEN environment variable is required. ' +
        'Set it to your Confluence Cloud OAuth token.'
    );
  }
  return token;
}

/**
 * Get and validate the Confluence Cloud ID from environment
 */
export function getCloudId(): string {
  const cloudId = process.env.CONFLUENCE_CLOUD_ID;
  if (!cloudId) {
    throw new Error(
      'CONFLUENCE_CLOUD_ID environment variable is required. ' +
        'Set it to your Atlassian Cloud site ID.'
    );
  }
  return cloudId;
}

/**
 * Build v1 API base URL
 */
function getBaseUrl(cloudId: string): string {
  return `https://api.atlassian.com/ex/confluence/${cloudId}/wiki/rest/api`;
}

/**
 * Delay helper for retry logic
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Make an HTTP request to the Confluence v1 API with retry on 429
 */
export async function request<T>(
  endpoint: string,
  params?: Record<string, string>,
  attempt: number = 0
): Promise<T> {
  const token = getToken();
  const cloudId = getCloudId();
  const baseUrl = getBaseUrl(cloudId);

  let url = `${baseUrl}${endpoint}`;
  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (response.status === 429 && attempt < MAX_RETRIES) {
    const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10);
    await delay(retryAfter * 1000);
    return request<T>(endpoint, params, attempt + 1);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Confluence API error ${response.status}: ${text}`);
  }

  return (await response.json()) as T;
}

/**
 * Strip HTML/XHTML tags from Confluence storage format body
 * Converts to readable plain text for agent consumption
 */
export function stripHtml(html: string): string {
  return html
    // Replace <br>, <br/>, <br /> with newlines
    .replace(/<br\s*\/?>/gi, '\n')
    // Replace block-level closing tags with newlines
    .replace(/<\/(p|div|h[1-6]|li|tr|td|th|blockquote)>/gi, '\n')
    // Remove all remaining HTML tags
    .replace(/<[^>]+>/g, '')
    // Decode common HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // Collapse multiple blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
