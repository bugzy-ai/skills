/**
 * Jira Cloud REST API v3 client
 * Uses native fetch() with OAuth Bearer authentication
 * Rate limit retry with exponential backoff + jitter on 429
 */

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

/**
 * Get and validate the Jira Cloud access token from environment
 */
export function getToken(): string {
  const token = process.env.JIRA_CLOUD_TOKEN;
  if (!token) {
    throw new Error(
      'JIRA_CLOUD_TOKEN environment variable is required. ' +
        'Set it to your Jira Cloud OAuth access token.'
    );
  }
  return token;
}

/**
 * Get and validate the Jira Cloud ID from environment
 */
export function getCloudId(): string {
  const cloudId = process.env.JIRA_CLOUD_ID;
  if (!cloudId) {
    throw new Error(
      'JIRA_CLOUD_ID environment variable is required. ' +
        'Set it to your Atlassian Cloud site ID.'
    );
  }
  return cloudId;
}

/**
 * Build the API base URL for Jira Cloud REST API v3
 */
function getBaseUrl(cloudId: string): string {
  return `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3`;
}

/**
 * Calculate backoff delay with jitter
 */
function getBackoffDelay(attempt: number, retryAfterHeader?: string | null): number {
  if (retryAfterHeader) {
    const seconds = parseInt(retryAfterHeader, 10);
    if (!isNaN(seconds)) return seconds * 1000;
  }
  const baseDelay = BASE_DELAY_MS * Math.pow(2, attempt);
  const jitter = Math.random() * baseDelay * 0.5;
  return baseDelay + jitter;
}

/**
 * Delay helper for retry logic
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parse Jira error response body into a human-readable message
 * Jira returns errors in two formats: errorMessages[] and errors{}
 */
async function parseErrorBody(response: Response): Promise<string> {
  try {
    const body = await response.json() as {
      errorMessages?: string[];
      errors?: Record<string, string>;
      message?: string;
    };
    const messages: string[] = [];
    if (body.errorMessages && body.errorMessages.length > 0) {
      messages.push(...body.errorMessages);
    }
    if (body.errors && Object.keys(body.errors).length > 0) {
      for (const [field, msg] of Object.entries(body.errors)) {
        messages.push(`${field}: ${msg}`);
      }
    }
    if (body.message) {
      messages.push(body.message);
    }
    if (messages.length > 0) return messages.join('; ');
  } catch {
    // Ignore JSON parse errors on error responses
  }
  return `HTTP ${response.status}`;
}

/**
 * Make an HTTP request to the Jira Cloud REST API v3
 * Supports GET, POST, PUT with automatic retry on 429
 */
export async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const token = getToken();
  const cloudId = getCloudId();
  const baseUrl = getBaseUrl(cloudId);
  const url = `${baseUrl}${path}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (response.ok) {
      // Handle 204 No Content
      if (response.status === 204) return {} as T;
      return (await response.json()) as T;
    }

    // Retry on 429 (rate limit) with backoff + jitter
    if (response.status === 429 && attempt < MAX_RETRIES) {
      const backoff = getBackoffDelay(attempt, response.headers.get('Retry-After'));
      await delay(backoff);
      continue;
    }

    const errorMessage = await parseErrorBody(response);
    throw new Error(`Jira API error ${response.status}: ${errorMessage}`);
  }

  throw new Error('Jira API: max retries exceeded');
}

/**
 * Convert plain text to Atlassian Document Format (ADF)
 * Jira Cloud REST API v3 requires ADF for descriptions and comment bodies
 */
export function textToAdf(text: string): object {
  const lines = text.split('\n');
  const content = lines.map((line) => ({
    type: 'paragraph',
    content: line
      ? [{ type: 'text', text: line }]
      : [],
  }));

  return {
    version: 1,
    type: 'doc',
    content,
  };
}
