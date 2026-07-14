import type {
  AzureListResponse,
  AzureResource,
  ManualTestStep,
  TestResultInput,
} from '../types';
import { getConfig } from '../api-client';

const RESULT_OUTCOMES = new Set([
  'Unspecified', 'None', 'Passed', 'Failed', 'Inconclusive', 'Timeout', 'Aborted',
  'Blocked', 'NotExecuted', 'Warning', 'Error', 'NotApplicable', 'Paused',
  'InProgress', 'NotImpacted',
]);

export function requireProject(project: string, command: string): void {
  if (!project) throw new Error(`--project is required for ${command}`);
}

export function parsePositiveId(value: string | undefined, name: string): number {
  const parsed = Number(value);
  if (!value || !Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

export function parseOptionalPositiveInt(value: string | undefined, name: string): number | undefined {
  if (value === undefined) return undefined;
  return parsePositiveId(value, name);
}

export function parseOptionalNonNegativeInt(value: string | undefined, name: string): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`${name} must be a non-negative integer`);
  return parsed;
}

export function parseIdList(value: string | undefined, name: string): number[] {
  if (!value) throw new Error(`${name} is required`);
  const ids = value.split(',').map((item) => parsePositiveId(item.trim(), name));
  return Array.from(new Set(ids));
}

export function parseBoolean(value: string | undefined, name: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`${name} must be true or false`);
}

export function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) query.set(key, String(value));
  }
  const encoded = query.toString();
  return encoded ? `?${encoded}` : '';
}

function parseJsonArray(value: string | undefined, name: string): Record<string, unknown>[] {
  if (!value) throw new Error(`${name} is required`);
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(`${name} must be valid JSON`);
  }
  if (!Array.isArray(parsed) || parsed.length === 0 || parsed.some((item) => (
    !item || typeof item !== 'object' || Array.isArray(item)
  ))) {
    throw new Error(`${name} must be a non-empty JSON array of objects`);
  }
  return parsed as Record<string, unknown>[];
}

export function parseManualSteps(value: string | undefined): ManualTestStep[] {
  return parseJsonArray(value, '--steps').map((step, index) => {
    if (typeof step.action !== 'string' || step.action.trim().length === 0) {
      throw new Error(`--steps item ${index + 1} requires a non-empty action`);
    }
    if (typeof step.expected !== 'string') {
      throw new Error(`--steps item ${index + 1} requires an expected string`);
    }
    return { action: step.action, expected: step.expected };
  });
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/\r?\n/g, '&lt;br/&gt;');
}

export function serializeManualSteps(steps: ManualTestStep[]): string {
  const serialized = steps.map((step, index) => (
    `<step id="${index + 2}" type="ActionStep">`
    + `<parameterizedString isformatted="true">&lt;DIV&gt;${escapeXml(step.action)}&lt;/DIV&gt;</parameterizedString>`
    + `<parameterizedString isformatted="true">&lt;DIV&gt;${escapeXml(step.expected)}&lt;/DIV&gt;</parameterizedString>`
    + '<description/>'
    + '</step>'
  )).join('');
  return `<steps id="0" last="${steps.length + 1}">${serialized}</steps>`;
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function decodeStepText(value: string): string {
  return decodeXml(value)
    .replace(/^<DIV>/i, '')
    .replace(/<\/DIV>$/i, '')
    .replace(/<br\s*\/>/gi, '\n');
}

export function deserializeManualSteps(value: string): ManualTestStep[] {
  return Array.from(value.matchAll(/<step\b[^>]*>([\s\S]*?)<\/step>/gi)).map((step) => {
    const values = Array.from(step[1].matchAll(/<parameterizedString\b[^>]*>([\s\S]*?)<\/parameterizedString>/gi));
    return {
      action: decodeStepText(values[0]?.[1] ?? ''),
      expected: decodeStepText(values[1]?.[1] ?? ''),
    };
  });
}

export function parseResultInputs(value: string | undefined, requireId: boolean): TestResultInput[] {
  return parseJsonArray(value, '--results').map((result, index) => {
    const output: TestResultInput = {};
    for (const field of ['comment', 'errorMessage', 'startedDate', 'completedDate', 'testCaseTitle', 'state'] as const) {
      if (result[field] !== undefined) {
        if (typeof result[field] !== 'string') throw new Error(`--results item ${index + 1} ${field} must be a string`);
        output[field] = result[field];
      }
    }
    for (const field of ['id', 'testPointId', 'testCaseId'] as const) {
      if (result[field] !== undefined) {
        if (typeof result[field] !== 'number' || !Number.isInteger(result[field]) || result[field] <= 0) {
          throw new Error(`--results item ${index + 1} ${field} must be a positive integer`);
        }
        output[field] = result[field];
      }
    }
    if (result.durationMs !== undefined) {
      if (typeof result.durationMs !== 'number' || !Number.isFinite(result.durationMs) || result.durationMs < 0) {
        throw new Error(`--results item ${index + 1} durationMs must be a non-negative number`);
      }
      output.durationMs = result.durationMs;
    }
    if (result.outcome !== undefined) {
      if (typeof result.outcome !== 'string' || !RESULT_OUTCOMES.has(result.outcome)) {
        throw new Error(`--results item ${index + 1} has an unsupported outcome`);
      }
      output.outcome = result.outcome;
    }
    if (requireId && (!output.id || !Number.isInteger(output.id))) {
      throw new Error(`--results item ${index + 1} requires a positive integer id`);
    }
    if (!requireId && output.testPointId === undefined && output.testCaseId === undefined && !output.testCaseTitle) {
      throw new Error(`--results item ${index + 1} requires testPointId, testCaseId, or testCaseTitle`);
    }
    return output;
  });
}

export function toAzureResult(input: TestResultInput): Record<string, unknown> {
  return {
    ...(input.id !== undefined ? { id: input.id } : {}),
    ...(input.testPointId !== undefined ? { testPoint: { id: String(input.testPointId) } } : {}),
    ...(input.testCaseId !== undefined ? { testCase: { id: String(input.testCaseId) } } : {}),
    ...(input.testCaseTitle ? { testCaseTitle: input.testCaseTitle } : {}),
    ...(input.outcome ? { outcome: input.outcome } : {}),
    ...(input.state ? { state: input.state } : input.outcome ? { state: 'Completed' } : {}),
    ...(input.durationMs !== undefined ? { durationInMs: input.durationMs } : {}),
    ...(input.comment !== undefined ? { comment: input.comment } : {}),
    ...(input.errorMessage !== undefined ? { errorMessage: input.errorMessage } : {}),
    ...(input.startedDate ? { startedDate: input.startedDate } : {}),
    ...(input.completedDate ? { completedDate: input.completedDate } : {}),
  };
}

function linkHref(resource: AzureResource, keys: string[]): string | undefined {
  for (const key of keys) {
    const href = resource._links?.[key]?.href ?? resource.links?.[key]?.href;
    if (typeof href === 'string' && href.length > 0) return href;
  }
  return undefined;
}

export type NormalizedResource<T extends AzureResource> = T & {
  id?: number | string;
  url?: string;
  webUrl?: string;
};

function compactWorkItemFields(value: unknown[]): Record<string, unknown> {
  const fields = Object.assign({}, ...value.filter((item) => item && typeof item === 'object' && !Array.isArray(item)));
  const steps = fields['Microsoft.VSTS.TCM.Steps'];
  return {
    ...(fields['System.State'] !== undefined ? { state: fields['System.State'] } : {}),
    ...(fields['System.WorkItemType'] !== undefined ? { type: fields['System.WorkItemType'] } : {}),
    ...(fields['System.Rev'] !== undefined ? { revision: fields['System.Rev'] } : {}),
    ...(fields['Microsoft.VSTS.Common.Priority'] !== undefined ? { priority: fields['Microsoft.VSTS.Common.Priority'] } : {}),
    ...(fields['Microsoft.VSTS.TCM.AutomationStatus'] !== undefined ? { automationStatus: fields['Microsoft.VSTS.TCM.AutomationStatus'] } : {}),
    ...(typeof steps === 'string' ? { steps: deserializeManualSteps(steps) } : {}),
  };
}

function compactValue(value: unknown, key?: string): unknown {
  if (Array.isArray(value)) {
    if (key === 'workItemFields') return compactWorkItemFields(value);
    return value.map((item) => compactValue(item));
  }
  if (!value || typeof value !== 'object') return value;

  const record = value as Record<string, unknown>;
  if (typeof record.displayName === 'string' && (record.descriptor || record.uniqueName || record.imageUrl)) {
    return {
      ...(record.id !== undefined ? { id: record.id } : {}),
      displayName: record.displayName,
    };
  }

  return Object.fromEntries(
    Object.entries(record).map(([childKey, child]) => [childKey, compactValue(child, childKey)]),
  );
}

export function normalizeResource<T extends AzureResource>(resource: T, fallbackWebUrl?: string): NormalizedResource<T> {
  const url = resource.url ?? linkHref(resource, ['_self', 'self']);
  const webUrl = resource.webAccessUrl
    ?? resource.webAccessUri
    ?? linkHref(resource, ['web', 'html']);
  return {
    ...compactValue(resource) as T,
    ...(url ? { url } : {}),
    ...(webUrl && /^https?:\/\//i.test(webUrl) ? { webUrl } : fallbackWebUrl ? { webUrl: fallbackWebUrl } : {}),
  };
}

function normalizeResourceTree<T extends AzureResource>(
  resource: T,
  fallbackWebUrl?: (resource: T) => string | undefined,
): NormalizedResource<T> {
  const normalized = normalizeResource(resource, fallbackWebUrl?.(resource));
  if (Array.isArray(resource.children)) {
    (normalized as NormalizedResource<T> & { children: Array<NormalizedResource<T>> }).children = resource.children.map((child) => (
      normalizeResourceTree(child as T, fallbackWebUrl)
    ));
  }
  return normalized;
}

export function normalizeList<T extends AzureResource>(
  response: AzureListResponse<T> | T[],
  continuationToken?: string,
  fallbackWebUrl?: (resource: T) => string | undefined,
): { count: number; value: Array<NormalizedResource<T>>; continuationToken?: string } {
  const value = Array.isArray(response) ? response : response.value;
  const count = Array.isArray(response) ? value.length : response.count ?? value.length;
  return {
    count,
    value: value.map((resource) => normalizeResourceTree(resource, fallbackWebUrl)),
    ...(continuationToken ? { continuationToken } : {}),
  };
}

function projectWebRoot(project: string): string {
  return `${getConfig().orgUrl}/${encodeURIComponent(project)}`;
}

function resourceId(resource: AzureResource): number | string | undefined {
  if (typeof resource.id === 'number' || typeof resource.id === 'string') return resource.id;
  const workItem = resource.workItem;
  if (!workItem || typeof workItem !== 'object' || Array.isArray(workItem)) return undefined;
  const id = (workItem as Record<string, unknown>).id;
  return typeof id === 'number' || typeof id === 'string' ? id : undefined;
}

export function planWebUrl(project: string, resource: AzureResource): string | undefined {
  const id = resourceId(resource);
  return id === undefined ? undefined : `${projectWebRoot(project)}/_testPlans/define?planId=${id}`;
}

export function suiteWebUrl(project: string, planId: number, resource: AzureResource): string | undefined {
  const id = resourceId(resource);
  return id === undefined ? undefined : `${projectWebRoot(project)}/_testPlans/define?planId=${planId}&suiteId=${id}`;
}

export function workItemWebUrl(project: string, resource: AzureResource): string | undefined {
  const id = resourceId(resource);
  return id === undefined ? undefined : `${projectWebRoot(project)}/_workitems/edit/${id}`;
}

export function runWebUrl(project: string, resource: AzureResource): string | undefined {
  const id = resourceId(resource);
  return id === undefined ? undefined : `${projectWebRoot(project)}/_TestManagement/Runs?runId=${id}`;
}
