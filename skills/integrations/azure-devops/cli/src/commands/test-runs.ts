import { request } from '../api-client';
import type { AzureListResponse, AzureResource } from '../types';
import {
  buildQuery,
  normalizeList,
  normalizeResource,
  parseIdList,
  parseBoolean,
  parseOptionalNonNegativeInt,
  parseOptionalPositiveInt,
  parsePositiveId,
  requireProject,
  runWebUrl,
} from './tcms-common';

export interface TestRunOptions {
  project: string;
  planId?: string;
  pointIds?: string;
  name?: string;
  comment?: string;
  automated?: string;
  top?: string;
  skip?: string;
  minLastUpdated?: string;
  maxLastUpdated?: string;
  completedDate?: string;
}

export async function testRunCommand(action: string, id: string | undefined, options: TestRunOptions): Promise<void> {
  requireProject(options.project, `test-run ${action}`);
  if (action === 'list') {
    const response = await request<AzureListResponse<AzureResource>>('GET', `test/runs${buildQuery({
      planId: options.planId,
      minLastUpdatedDate: options.minLastUpdated,
      maxLastUpdatedDate: options.maxLastUpdated,
      '$top': parseOptionalPositiveInt(options.top, '--top'),
      '$skip': parseOptionalNonNegativeInt(options.skip, '--skip'),
    })}`, { project: options.project });
    console.log(JSON.stringify(normalizeList(response, undefined, (run) => runWebUrl(options.project, run)), null, 2));
    return;
  }

  if (action === 'create') {
    if (!options.name) throw new Error('--name is required for test-run create');
    const planId = parsePositiveId(options.planId, '--plan-id');
    const pointIds = parseIdList(options.pointIds, '--point-ids');
    const run = await request<AzureResource>('POST', 'test/runs', {
      project: options.project,
      body: {
        name: options.name,
        plan: { id: String(planId) },
        pointIds,
        automated: parseBoolean(options.automated, '--automated') ?? false,
        ...(options.comment ? { comment: options.comment } : {}),
      },
    });
    console.log(JSON.stringify(normalizeResource(run, runWebUrl(options.project, run)), null, 2));
    return;
  }

  const runId = parsePositiveId(id, 'Test run ID');
  if (action === 'get') {
    const run = await request<AzureResource>('GET', `test/runs/${runId}`, {
      project: options.project,
    });
    console.log(JSON.stringify(normalizeResource(run, runWebUrl(options.project, run)), null, 2));
    return;
  }

  if (action === 'complete') {
    const run = await request<AzureResource>('PATCH', `test/runs/${runId}`, {
      project: options.project,
      body: {
        state: 'Completed',
        completedDate: options.completedDate ?? new Date().toISOString(),
        ...(options.comment ? { comment: options.comment } : {}),
      },
    });
    console.log(JSON.stringify(normalizeResource(run, runWebUrl(options.project, run)), null, 2));
    return;
  }

  throw new Error(`Unknown action: test-run ${action || '(none)'}`);
}
