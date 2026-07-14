import { request, requestWithMeta } from '../api-client';
import type { AzureListResponse, AzureResource } from '../types';
import {
  buildQuery,
  normalizeList,
  normalizeResource,
  planWebUrl,
  parseBoolean,
  parsePositiveId,
  requireProject,
} from './tcms-common';

export interface TestPlanOptions {
  project: string;
  name?: string;
  areaPath?: string;
  iteration?: string;
  description?: string;
  state?: string;
  startDate?: string;
  endDate?: string;
  owner?: string;
  continuationToken?: string;
  includeDetails?: string;
  activeOnly?: string;
}

export async function testPlanCommand(action: string, id: string | undefined, options: TestPlanOptions): Promise<void> {
  requireProject(options.project, `test-plan ${action}`);
  if (action === 'list') {
    const query = buildQuery({
      owner: options.owner,
      continuationToken: options.continuationToken,
      includePlanDetails: parseBoolean(options.includeDetails, '--include-details'),
      filterActivePlans: parseBoolean(options.activeOnly, '--active-only'),
    });
    const response = await requestWithMeta<AzureListResponse<AzureResource>>('GET', `testplan/plans${query}`, {
      project: options.project,
    });
    console.log(JSON.stringify(normalizeList(response.body, response.continuationToken, (plan) => planWebUrl(options.project, plan)), null, 2));
    return;
  }

  if (action === 'get') {
    const planId = parsePositiveId(id, 'Test plan ID');
    const plan = await request<AzureResource>('GET', `testplan/plans/${planId}`, {
      project: options.project,
    });
    console.log(JSON.stringify(normalizeResource(plan, planWebUrl(options.project, plan)), null, 2));
    return;
  }

  if (action === 'create') {
    if (!options.name) throw new Error('--name is required for test-plan create');
    const plan = await request<AzureResource>('POST', 'testplan/plans', {
      project: options.project,
      body: {
        name: options.name,
        areaPath: options.areaPath ?? options.project,
        iteration: options.iteration ?? options.project,
        owner: options.owner ? { id: options.owner } : null,
        ...(options.description ? { description: options.description } : {}),
        ...(options.state ? { state: options.state } : {}),
        ...(options.startDate ? { startDate: options.startDate } : {}),
        ...(options.endDate ? { endDate: options.endDate } : {}),
      },
    });
    console.log(JSON.stringify(normalizeResource(plan, planWebUrl(options.project, plan)), null, 2));
    return;
  }

  if (action === 'update') {
    const planId = parsePositiveId(id, 'Test plan ID');
    const body = {
      ...(options.name ? { name: options.name } : {}),
      ...(options.areaPath ? { areaPath: options.areaPath } : {}),
      ...(options.iteration ? { iteration: options.iteration } : {}),
      ...(options.description !== undefined ? { description: options.description } : {}),
      ...(options.state ? { state: options.state } : {}),
      ...(options.startDate ? { startDate: options.startDate } : {}),
      ...(options.endDate ? { endDate: options.endDate } : {}),
      ...(options.owner ? { owner: { id: options.owner } } : {}),
    };
    if (Object.keys(body).length === 0) throw new Error('At least one test plan field to update is required');
    const plan = await request<AzureResource>('PATCH', `testplan/plans/${planId}`, {
      project: options.project,
      body,
    });
    console.log(JSON.stringify(normalizeResource(plan, planWebUrl(options.project, plan)), null, 2));
    return;
  }

  throw new Error(`Unknown action: test-plan ${action || '(none)'}`);
}
