import { request, requestWithMeta } from '../api-client';
import type { AzureListResponse, AzureResource } from '../types';
import {
  buildQuery,
  normalizeList,
  normalizeResource,
  parseBoolean,
  parseIdList,
  parsePositiveId,
  requireProject,
  suiteWebUrl,
  workItemWebUrl,
} from './tcms-common';

const SUITE_TYPES = new Set(['staticTestSuite', 'dynamicTestSuite', 'requirementTestSuite']);

export interface TestSuiteOptions {
  project: string;
  planId?: string;
  name?: string;
  parentSuiteId?: string;
  suiteType?: string;
  query?: string;
  requirementId?: string;
  configurationIds?: string;
  inheritConfigurations?: string;
  continuationToken?: string;
  expand?: string;
  tree?: string;
  revision?: string;
  caseIds?: string;
}

export async function testSuiteCommand(action: string, id: string | undefined, options: TestSuiteOptions): Promise<void> {
  requireProject(options.project, `test-suite ${action}`);
  const planId = parsePositiveId(options.planId, '--plan-id');
  if (action === 'list') {
    const query = buildQuery({
      expand: options.expand,
      continuationToken: options.continuationToken,
      asTreeView: parseBoolean(options.tree, '--tree'),
    });
    const response = await requestWithMeta<AzureListResponse<AzureResource>>(
      'GET', `testplan/Plans/${planId}/suites${query}`,
      { project: options.project },
    );
    console.log(JSON.stringify(normalizeList(response.body, response.continuationToken, (suite) => suiteWebUrl(options.project, planId, suite)), null, 2));
    return;
  }

  const suiteId = action === 'create' ? undefined : parsePositiveId(id, 'Test suite ID');
  if (action === 'get') {
    const suite = await request<AzureResource>('GET', `testplan/Plans/${planId}/suites/${suiteId}`, {
      project: options.project,
    });
    console.log(JSON.stringify(normalizeResource(suite, suiteWebUrl(options.project, planId, suite)), null, 2));
    return;
  }

  if (action === 'create') {
    if (!options.name) throw new Error('--name is required for test-suite create');
    const parentSuiteId = parsePositiveId(options.parentSuiteId, '--parent-suite-id');
    const suiteType = options.suiteType ?? 'staticTestSuite';
    if (!SUITE_TYPES.has(suiteType)) throw new Error('--suite-type must be staticTestSuite, dynamicTestSuite, or requirementTestSuite');
    if (suiteType === 'dynamicTestSuite' && !options.query) throw new Error('--query is required for a dynamicTestSuite');
    if (suiteType === 'requirementTestSuite' && !options.requirementId) throw new Error('--requirement-id is required for a requirementTestSuite');
    const configurationIds = options.configurationIds ? parseIdList(options.configurationIds, '--configuration-ids') : [];
    const suite = await request<AzureResource>('POST', `testplan/Plans/${planId}/suites`, {
      project: options.project,
      body: {
        name: options.name,
        suiteType,
        parentSuite: { id: parentSuiteId },
        inheritDefaultConfigurations: parseBoolean(options.inheritConfigurations, '--inherit-configurations') ?? configurationIds.length === 0,
        ...(configurationIds.length > 0 ? { defaultConfigurations: configurationIds.map((configurationId) => ({ id: configurationId })) } : {}),
        ...(options.query ? { queryString: options.query } : {}),
        ...(options.requirementId ? { requirementId: parsePositiveId(options.requirementId, '--requirement-id') } : {}),
      },
    });
    console.log(JSON.stringify(normalizeResource(suite, suiteWebUrl(options.project, planId, suite)), null, 2));
    return;
  }

  if (action === 'update') {
    const body = {
      ...(options.name ? { name: options.name } : {}),
      ...(options.parentSuiteId ? { parentSuite: { id: parsePositiveId(options.parentSuiteId, '--parent-suite-id') } } : {}),
      ...(options.query !== undefined ? { queryString: options.query } : {}),
      ...(options.revision ? { revision: parsePositiveId(options.revision, '--revision') } : {}),
      ...(options.inheritConfigurations !== undefined ? {
        inheritDefaultConfigurations: parseBoolean(options.inheritConfigurations, '--inherit-configurations'),
      } : {}),
      ...(options.configurationIds ? {
        defaultConfigurations: parseIdList(options.configurationIds, '--configuration-ids').map((configurationId) => ({ id: configurationId })),
      } : {}),
    };
    if (Object.keys(body).length === 0) throw new Error('At least one test suite field to update is required');
    const suite = await request<AzureResource>('PATCH', `testplan/Plans/${planId}/suites/${suiteId}`, {
      project: options.project,
      body,
    });
    console.log(JSON.stringify(normalizeResource(suite, suiteWebUrl(options.project, planId, suite)), null, 2));
    return;
  }

  if (action === 'add-cases') {
    const caseIds = parseIdList(options.caseIds, '--case-ids');
    const configurationIds = options.configurationIds ? parseIdList(options.configurationIds, '--configuration-ids') : [];
    const response = await request<AzureListResponse<AzureResource> | AzureResource[]>('POST', `testplan/Plans/${planId}/Suites/${suiteId}/TestCase`, {
      project: options.project,
      body: caseIds.map((caseId) => ({
        workItem: { id: caseId },
        ...(configurationIds.length > 0 ? {
          pointAssignments: configurationIds.map((configurationId) => ({ configurationId })),
        } : {}),
      })),
    });
    console.log(JSON.stringify(normalizeList(response, undefined, (testCase) => workItemWebUrl(options.project, testCase)), null, 2));
    return;
  }

  if (action === 'remove-cases') {
    const caseIds = parseIdList(options.caseIds, '--case-ids');
    await request('DELETE', `testplan/Plans/${planId}/Suites/${suiteId}/TestCase${buildQuery({ testCaseIds: caseIds.join(',') })}`, {
      project: options.project,
    });
    console.log(JSON.stringify({ planId, suiteId, removedTestCaseIds: caseIds }, null, 2));
    return;
  }

  throw new Error(`Unknown action: test-suite ${action || '(none)'}`);
}
