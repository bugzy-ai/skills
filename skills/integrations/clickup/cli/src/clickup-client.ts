/**
 * ClickUp REST API v2 client
 * Uses native fetch() with token authentication and rate limit handling
 */

const CLICKUP_API_URL = 'https://api.clickup.com/api/v2';

/**
 * Get and validate the ClickUp API token from environment
 */
export function getApiToken(): string {
  const token = process.env.CLICKUP_API_TOKEN;
  if (!token) {
    throw new Error(
      'CLICKUP_API_TOKEN environment variable is required. ' +
        'Set it to your ClickUp API token or OAuth access token.'
    );
  }
  return token;
}

/**
 * Get and validate the ClickUp team (workspace) ID from environment
 */
export function getTeamId(): string {
  const teamId = process.env.CLICKUP_TEAM_ID;
  if (!teamId) {
    throw new Error(
      'CLICKUP_TEAM_ID environment variable is required. ' +
        'Set it to your ClickUp workspace (team) ID.'
    );
  }
  return teamId;
}

/**
 * Execute a REST API request against the ClickUp API
 * Handles authentication, rate limiting, and error responses
 */
export async function request<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const token = getApiToken();
  const url = `${CLICKUP_API_URL}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: token,
  };

  const options: RequestInit = { method, headers };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  // Handle rate limiting with retry
  if (response.status === 429) {
    const resetHeader = response.headers.get('X-RateLimit-Reset');
    if (resetHeader) {
      const resetTime = parseInt(resetHeader, 10) * 1000; // Convert to ms
      const waitMs = Math.max(0, resetTime - Date.now()) + 100; // Add 100ms buffer
      const maxWait = 60_000; // Cap at 60 seconds

      if (waitMs <= maxWait) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        // Retry the request once
        const retryResponse = await fetch(url, options);
        if (!retryResponse.ok) {
          const text = await retryResponse.text();
          throw new Error(`ClickUp API error ${retryResponse.status}: ${text}`);
        }
        return (await retryResponse.json()) as T;
      }
    }
    throw new Error(
      'ClickUp API rate limit exceeded (429). Please wait before retrying.'
    );
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ClickUp API error ${response.status}: ${text}`);
  }

  // Some endpoints (like DELETE) may return no content
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    return {} as T;
  }

  return (await response.json()) as T;
}
