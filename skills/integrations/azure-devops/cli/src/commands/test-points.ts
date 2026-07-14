import { requestWithMeta } from '../api-client';
import type { AzureListResponse, AzureResource } from '../types';
import {
  buildQuery,
  normalizeList,
  parseBoolean,
  parsePositiveId,
  requireProject,
  suiteWebUrl,
} from './tcms-common';

export interface TestPointOptions {
  project: string;
  planId?: string;
  suiteId?: string;
  caseId?: string;
  pointIds?: string;
  continuationToken?: string;
  includeDetails?: string;
  recursive?: string;
}

export async function testPointCommand(action: string, options: TestPointOptions): Promise<void> {
  if (action !== 'list') throw new Error(`Unknown action: test-point ${action || '(none)'}`);
  requireProject(options.project, 'test-point list');
  const planId = parsePositiveId(options.planId, '--plan-id');
  const suiteId = parsePositiveId(options.suiteId, '--suite-id');
  const response = await requestWithMeta<AzureListResponse<AzureResource>>(
    'GET',
    `testplan/Plans/${planId}/Suites/${suiteId}/TestPoint${buildQuery({
      testCaseId: options.caseId,
      testPointIds: options.pointIds,
      continuationToken: options.continuationToken,
      includePointDetails: parseBoolean(options.includeDetails, '--include-details'),
      isRecursive: parseBoolean(options.recursive, '--recursive'),
    })}`,
    { project: options.project },
  );
  console.log(JSON.stringify(normalizeList(
    response.body,
    response.continuationToken,
    () => suiteWebUrl(options.project, planId, { id: suiteId }),
  ), null, 2));
}
