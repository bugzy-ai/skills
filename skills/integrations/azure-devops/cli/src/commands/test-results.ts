import { request } from '../api-client';
import type { AzureListResponse, AzureResource } from '../types';
import {
  buildQuery,
  normalizeList,
  normalizeResource,
  parseOptionalNonNegativeInt,
  parseOptionalPositiveInt,
  parsePositiveId,
  parseResultInputs,
  requireProject,
  runWebUrl,
  toAzureResult,
} from './tcms-common';

export interface TestResultOptions {
  project: string;
  runId?: string;
  results?: string;
  top?: string;
  skip?: string;
  outcomes?: string;
  details?: string;
  outcome?: string;
  state?: string;
  durationMs?: string;
  comment?: string;
  errorMessage?: string;
  startedDate?: string;
  completedDate?: string;
}

export async function testResultCommand(action: string, id: string | undefined, options: TestResultOptions): Promise<void> {
  requireProject(options.project, `test-result ${action}`);
  const runId = parsePositiveId(options.runId, '--run-id');
  if (action === 'list') {
    const response = await request<AzureListResponse<AzureResource>>('GET', `test/Runs/${runId}/results${buildQuery({
      detailsToInclude: options.details,
      outcomes: options.outcomes,
      '$top': parseOptionalPositiveInt(options.top, '--top'),
      '$skip': parseOptionalNonNegativeInt(options.skip, '--skip'),
    })}`, { project: options.project });
    console.log(JSON.stringify(normalizeList(response, undefined, () => runWebUrl(options.project, { id: runId })), null, 2));
    return;
  }

  if (action === 'get') {
    const resultId = parsePositiveId(id, 'Test result ID');
    const result = await request<AzureResource>('GET', `test/Runs/${runId}/results/${resultId}${buildQuery({ detailsToInclude: options.details })}`, {
      project: options.project,
    });
    console.log(JSON.stringify(normalizeResource(result, runWebUrl(options.project, { id: runId })), null, 2));
    return;
  }

  if (action === 'add') {
    const body = parseResultInputs(options.results, false).map(toAzureResult);
    const response = await request<AzureListResponse<AzureResource> | AzureResource[]>('POST', `test/Runs/${runId}/results`, {
      project: options.project,
      body,
    });
    console.log(JSON.stringify(normalizeList(response, undefined, () => runWebUrl(options.project, { id: runId })), null, 2));
    return;
  }

  if (action === 'update') {
    let body: Record<string, unknown>[];
    if (options.results) {
      body = parseResultInputs(options.results, true).map(toAzureResult);
    } else {
      const resultId = parsePositiveId(id, 'Test result ID');
      const scalarInput = {
        id: resultId,
        ...(options.outcome ? { outcome: options.outcome } : {}),
        ...(options.state ? { state: options.state } : {}),
        ...(options.durationMs !== undefined ? { durationMs: Number(options.durationMs) } : {}),
        ...(options.comment !== undefined ? { comment: options.comment } : {}),
        ...(options.errorMessage !== undefined ? { errorMessage: options.errorMessage } : {}),
        ...(options.startedDate ? { startedDate: options.startedDate } : {}),
        ...(options.completedDate ? { completedDate: options.completedDate } : {}),
      };
      if (Object.keys(scalarInput).length === 1) throw new Error('At least one test result field to update is required');
      body = parseResultInputs(JSON.stringify([scalarInput]), true).map(toAzureResult);
    }
    const response = await request<AzureListResponse<AzureResource> | AzureResource[]>('PATCH', `test/Runs/${runId}/results`, {
      project: options.project,
      body,
    });
    console.log(JSON.stringify(normalizeList(response, undefined, () => runWebUrl(options.project, { id: runId })), null, 2));
    return;
  }

  throw new Error(`Unknown action: test-result ${action || '(none)'}`);
}
