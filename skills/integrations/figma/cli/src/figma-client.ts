/**
 * Figma REST API v1 client
 * Supports both PAT and OAuth token authentication:
 *   - PATs (figd_ prefix) → X-Figma-Token header
 *   - OAuth tokens (figu_ prefix) → Authorization: Bearer header
 * Single retry on 429 with Retry-After header
 * All operations are read-only (GET requests only)
 */

const MAX_RETRIES = 1;

/**
 * Get and validate the Figma access token from environment
 */
export function getToken(): string {
  const token = process.env.FIGMA_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      'FIGMA_ACCESS_TOKEN environment variable is required. ' +
        'Set it to your Figma OAuth token.'
    );
  }
  return token;
}

/**
 * Delay helper for retry logic
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Make a GET request to the Figma REST API v1 with retry on 429
 */
export async function request<T>(
  endpoint: string,
  params?: Record<string, string>,
  attempt: number = 0
): Promise<T> {
  const token = getToken();

  let url = `https://api.figma.com/v1${endpoint}`;
  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  // PATs (figd_) use X-Figma-Token header; OAuth tokens (figu_) use Bearer.
  // Sending both headers simultaneously causes auth failures, so we detect
  // the token type by prefix and pick the correct header.
  const isOAuth = token.startsWith('figu_');
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (isOAuth) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    headers['X-Figma-Token'] = token;
  }

  const response = await fetch(url, { method: 'GET', headers });

  if (response.status === 429 && attempt < MAX_RETRIES) {
    const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10);
    await delay(retryAfter * 1000);
    return request<T>(endpoint, params, attempt + 1);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Figma API error ${response.status}: ${text}`);
  }

  return (await response.json()) as T;
}
