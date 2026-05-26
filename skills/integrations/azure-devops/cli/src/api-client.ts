/**
 * Azure DevOps REST API client
 * Uses native fetch() with Basic auth (PAT) authentication
 */

import type {
  AzureDevOpsConfig,
  AzureDevOpsErrorResponse,
  JsonPatchOperation,
  Project,
  ProjectsResponse,
  WiqlQueryResult,
  WorkItem,
  WorkItemComment,
} from './types';

const DEFAULT_API_VERSION = '7.1';
const DEFAULT_TIMEOUT = 30_000;
const MAX_RETRIES = 3;
const MAX_BATCH_SIZE = 200;

export class AzureDevOpsError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public isRetryable: boolean
  ) {
    super(message);
    this.name = 'AzureDevOpsError';
  }
}

/**
 * Get and validate Azure DevOps configuration from environment
 */
export function getConfig(): AzureDevOpsConfig {
  const orgUrl = process.env.AZURE_DEVOPS_ORG_URL;
  if (!orgUrl) {
    throw new Error(
      'AZURE_DEVOPS_ORG_URL environment variable is required. ' +
        'Set it to your Azure DevOps organization URL (e.g., https://dev.azure.com/my-org).'
    );
  }
  const pat = process.env.AZURE_DEVOPS_PAT;
  if (!pat) {
    throw new Error(
      'AZURE_DEVOPS_PAT environment variable is required. ' +
        'Set it to your Azure DevOps Personal Access Token.'
    );
  }
  return { orgUrl: orgUrl.replace(/\/$/, ''), pat };
}

/**
 * Calculate backoff delay with exponential increase
 */
function getBackoffDelay(attempt: number, retryAfterHeader?: string | null): number {
  if (retryAfterHeader) {
    const seconds = parseInt(retryAfterHeader, 10);
    if (!isNaN(seconds)) return seconds * 1000;
  }
  return Math.min(1000 * Math.pow(2, attempt), 30_000);
}

/**
 * Make an authenticated request to the Azure DevOps REST API with retry logic
 */
export async function request<T>(
  method: string,
  endpoint: string,
  options?: {
    body?: unknown;
    contentType?: string;
    project?: string;
    apiVersion?: string;
    config?: AzureDevOpsConfig;
  }
): Promise<T> {
  const config = options?.config ?? getConfig();
  const apiVersion = options?.apiVersion ?? DEFAULT_API_VERSION;
  const authHeader = `Basic ${Buffer.from(`:${config.pat}`).toString('base64')}`;

  const baseUrl = options?.project
    ? `${config.orgUrl}/${encodeURIComponent(options.project)}`
    : config.orgUrl;

  const separator = endpoint.includes('?') ? '&' : '?';
  const url = `${baseUrl}/_apis/${endpoint}${separator}api-version=${apiVersion}`;

  const contentType = options?.contentType ?? 'application/json';
  const headers: Record<string, string> = {
    Authorization: authHeader,
    Accept: 'application/json',
    'Content-Type': contentType,
  };

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout ?? DEFAULT_TIMEOUT);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: options?.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        // Handle 204 No Content
        if (response.status === 204) return {} as T;
        return (await response.json()) as T;
      }

      const isRetryable =
        response.status === 429 ||
        response.status >= 500;

      if (isRetryable && attempt < MAX_RETRIES) {
        const delay = getBackoffDelay(attempt, response.headers.get('Retry-After'));
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // Parse error body
      let errorMessage = `Azure DevOps API error ${response.status}`;
      try {
        const errorBody = (await response.json()) as AzureDevOpsErrorResponse;
        if (errorBody.message) {
          errorMessage = errorBody.message;
        }
      } catch {
        // Ignore JSON parse errors on error responses
      }

      if (response.status === 401) {
        errorMessage =
          'Authentication failed (401). Your Personal Access Token may be expired or have insufficient permissions.';
      }

      throw new AzureDevOpsError(errorMessage, response.status, isRetryable);
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof AzureDevOpsError) throw error;

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new AzureDevOpsError(
          `Request timed out after ${(config.timeout ?? DEFAULT_TIMEOUT) / 1000}s`,
          0,
          true
        );
      }

      // Network errors are retryable
      if (attempt < MAX_RETRIES) {
        const delay = getBackoffDelay(attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw new AzureDevOpsError(
        `Network error: ${error instanceof Error ? error.message : String(error)}`,
        0,
        true
      );
    }
  }

  // Should not reach here, but TypeScript needs it
  throw new AzureDevOpsError('Max retries exceeded', 0, true);
}

/**
 * List projects in the organization (org-level, no project required)
 */
export async function listProjects(options?: {
  top?: number;
  skip?: number;
  config?: AzureDevOpsConfig;
}): Promise<Project[]> {
  const params: string[] = [];
  if (options?.top) params.push(`$top=${options.top}`);
  if (options?.skip) params.push(`$skip=${options.skip}`);
  const endpoint = `projects${params.length ? '?' + params.join('&') : ''}`;
  const result = await request<ProjectsResponse>('GET', endpoint, {
    config: options?.config,
  });
  return result.value;
}

/**
 * Execute a WIQL query and return work item IDs
 */
export async function wiqlQuery(
  wiql: string,
  project: string,
  options?: { top?: number; config?: AzureDevOpsConfig }
): Promise<WiqlQueryResult> {
  const params = options?.top ? `?$top=${options.top}` : '';
  return request<WiqlQueryResult>('POST', `wit/wiql${params}`, {
    body: { query: wiql },
    project,
    config: options?.config,
  });
}

/**
 * Batch-fetch work items by IDs (max 200 per batch)
 */
export async function getWorkItemsBatch(
  ids: number[],
  project: string,
  options?: { fields?: string; expand?: string; config?: AzureDevOpsConfig }
): Promise<WorkItem[]> {
  if (ids.length === 0) return [];

  const batches: number[][] = [];
  for (let i = 0; i < ids.length; i += MAX_BATCH_SIZE) {
    batches.push(ids.slice(i, i + MAX_BATCH_SIZE));
  }

  const results = await Promise.all(
    batches.map(async (batch) => {
      const params: string[] = [`ids=${batch.join(',')}`];
      if (options?.fields) params.push(`fields=${options.fields}`);
      if (options?.expand) params.push(`$expand=${options.expand}`);
      const endpoint = `wit/workitems?${params.join('&')}`;
      const result = await request<{ value: WorkItem[] }>('GET', endpoint, {
        project,
        config: options?.config,
      });
      return result.value;
    })
  );

  return results.flat();
}

/**
 * Search work items — two-phase: WIQL returns IDs, then batch fetch details
 */
export async function searchWorkItems(
  wiql: string,
  project: string,
  options?: { top?: number; fields?: string; config?: AzureDevOpsConfig }
): Promise<{ queryResult: WiqlQueryResult; workItems: WorkItem[] }> {
  const queryResult = await wiqlQuery(wiql, project, {
    top: options?.top,
    config: options?.config,
  });

  const ids = queryResult.workItems.map((wi) => wi.id);
  const workItems = await getWorkItemsBatch(ids, project, {
    fields: options?.fields,
    config: options?.config,
  });

  return { queryResult, workItems };
}

/**
 * Get a single work item by ID
 */
export async function getWorkItem(
  id: number,
  project: string,
  options?: { fields?: string; expand?: string; config?: AzureDevOpsConfig }
): Promise<WorkItem> {
  const params: string[] = [];
  if (options?.fields) params.push(`fields=${options.fields}`);
  if (options?.expand) params.push(`$expand=${options.expand}`);
  const endpoint = `wit/workitems/${id}${params.length ? '?' + params.join('&') : ''}`;
  return request<WorkItem>('GET', endpoint, {
    project,
    config: options?.config,
  });
}

/**
 * Create a work item with JSON Patch operations
 */
export async function createWorkItem(
  type: string,
  operations: JsonPatchOperation[],
  project: string,
  options?: { config?: AzureDevOpsConfig }
): Promise<WorkItem> {
  return request<WorkItem>('POST', `wit/workitems/$${encodeURIComponent(type)}`, {
    body: operations,
    contentType: 'application/json-patch+json',
    project,
    config: options?.config,
  });
}

/**
 * Update a work item with JSON Patch operations
 */
export async function updateWorkItem(
  id: number,
  operations: JsonPatchOperation[],
  project: string,
  options?: { config?: AzureDevOpsConfig }
): Promise<WorkItem> {
  return request<WorkItem>('PATCH', `wit/workitems/${id}`, {
    body: operations,
    contentType: 'application/json-patch+json',
    project,
    config: options?.config,
  });
}

/**
 * Add a comment to a work item (uses preview API 7.1-preview.4)
 */
export async function addComment(
  id: number,
  text: string,
  project: string,
  options?: { config?: AzureDevOpsConfig }
): Promise<WorkItemComment> {
  return request<WorkItemComment>('POST', `wit/workitems/${id}/comments`, {
    body: { text },
    project,
    apiVersion: '7.1-preview.4',
    config: options?.config,
  });
}

/**
 * Build JSON Patch operations from a map of field names to values
 */
export function buildJsonPatch(
  fields: Record<string, unknown>
): JsonPatchOperation[] {
  const FIELD_MAP: Record<string, string> = {
    title: '/fields/System.Title',
    description: '/fields/System.Description',
    state: '/fields/System.State',
    'assigned-to': '/fields/System.AssignedTo',
    assignee: '/fields/System.AssignedTo',
    'area-path': '/fields/System.AreaPath',
    'iteration-path': '/fields/System.IterationPath',
    priority: '/fields/Microsoft.VSTS.Common.Priority',
    severity: '/fields/Microsoft.VSTS.Common.Severity',
    tags: '/fields/System.Tags',
  };

  const ops: JsonPatchOperation[] = [];
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue;
    const path = FIELD_MAP[key] ?? `/fields/${key}`;
    ops.push({ op: 'add', path, value });
  }
  return ops;
}

/**
 * Get the org base URL (for constructing relation URLs)
 */
export function getBaseUrl(config?: AzureDevOpsConfig): string {
  return (config ?? getConfig()).orgUrl;
}
