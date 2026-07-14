import { buildJsonPatch, createWorkItem, getWorkItem, requestWithMeta, updateWorkItem } from '../api-client';
import type { AzureListResponse, AzureResource, JsonPatchOperation, WorkItem } from '../types';
import {
  buildQuery,
  deserializeManualSteps,
  normalizeList,
  normalizeResource,
  parseManualSteps,
  parseOptionalPositiveInt,
  parsePositiveId,
  requireProject,
  serializeManualSteps,
  workItemWebUrl,
} from './tcms-common';

export interface TestCaseOptions {
  project: string;
  planId?: string;
  suiteId?: string;
  title?: string;
  steps?: string;
  priority?: string;
  areaPath?: string;
  iterationPath?: string;
  tags?: string;
  state?: string;
  continuationToken?: string;
  configurationIds?: string;
}

const TEST_CASE_PERMISSION_HINT = 'The PAT needs Azure DevOps Test Management read/write permission and access to Test Case work items.';

function summarizeTestCase(testCase: WorkItem): AzureResource {
  const steps = testCase.fields['Microsoft.VSTS.TCM.Steps'];
  return {
    id: testCase.id,
    revision: testCase.rev,
    type: testCase.fields['System.WorkItemType'],
    title: testCase.fields['System.Title'],
    state: testCase.fields['System.State'],
    areaPath: testCase.fields['System.AreaPath'],
    iterationPath: testCase.fields['System.IterationPath'],
    priority: testCase.fields['Microsoft.VSTS.Common.Priority'],
    tags: testCase.fields['System.Tags'],
    ...(typeof steps === 'string' ? { steps: deserializeManualSteps(steps) } : {}),
    ...(testCase.relations ? { relations: testCase.relations } : {}),
    url: testCase.url,
    _links: testCase._links,
  };
}

function testCasePatch(options: TestCaseOptions): JsonPatchOperation[] {
  const fields: Record<string, unknown> = {};
  if (options.title) fields.title = options.title;
  if (options.steps) fields['Microsoft.VSTS.TCM.Steps'] = serializeManualSteps(parseManualSteps(options.steps));
  if (options.priority) fields.priority = parsePositiveId(options.priority, '--priority');
  if (options.areaPath) fields['area-path'] = options.areaPath;
  if (options.iterationPath) fields['iteration-path'] = options.iterationPath;
  if (options.tags) fields.tags = options.tags;
  if (options.state) fields.state = options.state;
  return buildJsonPatch(fields);
}

export async function testCaseCommand(action: string, id: string | undefined, options: TestCaseOptions): Promise<void> {
  requireProject(options.project, `test-case ${action}`);

  if (action === 'list') {
    const planId = parsePositiveId(options.planId, '--plan-id');
    const suiteId = parsePositiveId(options.suiteId, '--suite-id');
    const response = await requestWithMeta<AzureListResponse<AzureResource>>(
      'GET',
      `testplan/Plans/${planId}/Suites/${suiteId}/TestCase${buildQuery({
        configurationIds: options.configurationIds,
        continuationToken: options.continuationToken,
      })}`,
      { project: options.project },
    );
    console.log(JSON.stringify(normalizeList(
      response.body,
      response.continuationToken,
      (testCase) => workItemWebUrl(options.project, testCase),
    ), null, 2));
    return;
  }

  if (action === 'get') {
    const caseId = parsePositiveId(id, 'Test Case ID');
    const testCase = await getWorkItem(caseId, options.project, {
      fields: 'System.Id,System.Title,System.State,System.WorkItemType,System.AreaPath,System.IterationPath,System.Tags,Microsoft.VSTS.Common.Priority,Microsoft.VSTS.TCM.Steps',
      expand: 'Links',
      permissionHint: TEST_CASE_PERMISSION_HINT,
    });
    const resource = summarizeTestCase(testCase);
    console.log(JSON.stringify(normalizeResource(resource, workItemWebUrl(options.project, resource)), null, 2));
    return;
  }

  if (action === 'create') {
    if (!options.title) throw new Error('--title is required for test-case create');
    if (!options.steps) throw new Error('--steps is required for test-case create');
    const testCase = await createWorkItem('Test Case', testCasePatch(options), options.project, {
      permissionHint: TEST_CASE_PERMISSION_HINT,
    });
    const resource = summarizeTestCase(testCase);
    console.log(JSON.stringify(normalizeResource(resource, workItemWebUrl(options.project, resource)), null, 2));
    return;
  }

  if (action === 'update') {
    const caseId = parsePositiveId(id, 'Test Case ID');
    parseOptionalPositiveInt(options.priority, '--priority');
    const operations = testCasePatch(options);
    if (operations.length === 0) throw new Error('At least one Test Case field to update is required');
    const testCase = await updateWorkItem(caseId, operations, options.project, {
      permissionHint: TEST_CASE_PERMISSION_HINT,
    });
    const resource = summarizeTestCase(testCase);
    console.log(JSON.stringify(normalizeResource(resource, workItemWebUrl(options.project, resource)), null, 2));
    return;
  }

  throw new Error(`Unknown action: test-case ${action || '(none)'}`);
}
