const DEFAULT_BASE_URL = 'https://app.testiny.io';
const MAX_RETRIES = 3;
const MAX_BACKOFF_MS = 10_000;
const FETCH_TIMEOUT_MS = 30_000;

function getApiKey(): string {
  const key = process.env.TESTINY_API_KEY;
  if (!key) {
    throw new Error(
      'TESTINY_API_KEY environment variable is required. ' +
        'Generate one at: Testiny → Settings → API keys.'
    );
  }
  return key;
}

function getBaseUrl(): string {
  return `${process.env.TESTINY_APP_URL ?? DEFAULT_BASE_URL}/api/v1`;
}

export async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  params?: Record<string, string | number | undefined>,
  attempt = 0
): Promise<T> {
  const key = getApiKey();
  const url = new URL(`${getBaseUrl()}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') {
        url.searchParams.set(k, String(v));
      }
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': key,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
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

  if (response.status === 204) {
    return {} as T;
  }

  // Testiny does NOT send Retry-After. Use fixed exponential backoff.
  const isRetryable =
    response.status === 429 ||
    response.status === 502 ||
    response.status === 503 ||
    response.status === 504;
  if (isRetryable && attempt < MAX_RETRIES) {
    const retryMs = Math.min(250 * 2 ** attempt, MAX_BACKOFF_MS);
    await new Promise((resolve) => setTimeout(resolve, retryMs));
    return request<T>(method, path, body, params, attempt + 1);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Testiny API error ${response.status}: ${text}`);
  }

  const text = await response.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}
