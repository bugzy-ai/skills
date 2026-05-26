/**
 * Linear GraphQL API client
 * Uses native fetch() with LINEAR_API_KEY authentication
 */

import type { GraphQLResponse } from './types';

const LINEAR_API_URL = 'https://api.linear.app/graphql';

/**
 * Get and validate the Linear API key from environment
 */
function getApiKey(): string {
  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey) {
    throw new Error(
      'LINEAR_API_KEY environment variable is required. ' +
        'Set it to your Linear API key or OAuth token.'
    );
  }
  return apiKey;
}

/**
 * Execute a GraphQL query against the Linear API
 */
export async function query<T>(
  queryString: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const apiKey = getApiKey();

  const response = await fetch(LINEAR_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey,
    },
    body: JSON.stringify({ query: queryString, variables }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error(
        `Linear API rate limit exceeded (429). Please wait before retrying.`
      );
    }
    const text = await response.text();
    throw new Error(`Linear API error ${response.status}: ${text}`);
  }

  const json = (await response.json()) as GraphQLResponse<T>;

  if (json.errors && json.errors.length > 0) {
    const messages = json.errors.map((e) => e.message).join('; ');
    throw new Error(`Linear GraphQL error: ${messages}`);
  }

  if (!json.data) {
    throw new Error('Linear API returned empty data');
  }

  return json.data;
}
