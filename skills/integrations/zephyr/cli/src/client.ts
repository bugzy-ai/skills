/**
 * Zephyr Scale Cloud REST API v2 client
 * Uses native fetch() with Bearer token authentication
 */

const BASE_URL = 'https://api.zephyrscale.smartbear.com/v2';
const MAX_RETRIES = 3;
const MAX_BACKOFF_MS = 10_000;
const FETCH_TIMEOUT_MS = 30_000; // 30 seconds

/**
 * Get and validate the Zephyr API token from environment
 */
function getToken(): string {
  const token = process.env.ZEPHYR_API_TOKEN;
  if (!token) {
    throw new Error(
      'ZEPHYR_API_TOKEN environment variable is required. ' +
        'Generate one at: Jira Settings → General Settings → Apps → Zephyr API Access Tokens.'
    );
  }
  return token;
}

/**
 * Execute an HTTP request against the Zephyr Scale API
 */
export async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  params?: Record<string, string | number | undefined>,
  attempt = 0
): Promise<T> {
  const token = getToken();

  // Build URL with query params
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Request timeout after ${FETCH_TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  // Handle rate limiting and transient server errors with retry
  const isRetryable = response.status === 429 || response.status === 502 || response.status === 503 || response.status === 504;
  if (isRetryable && attempt < MAX_RETRIES) {
    const retryAfter = response.headers.get('Retry-After');
    const retryMs = retryAfter
      ? Math.min(parseInt(retryAfter, 10) * 1000, MAX_BACKOFF_MS)
      : Math.min(1000 * 2 ** attempt, MAX_BACKOFF_MS);

    await new Promise((resolve) => setTimeout(resolve, retryMs));
    return request<T>(method, path, body, params, attempt + 1);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Zephyr API error ${response.status}: ${text}`);
  }

  const text = await response.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}
