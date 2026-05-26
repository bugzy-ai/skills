import { request } from '../client';
import type { TestinyTestCase, TestinyTemplate } from '../types';

interface CreateCaseArgs {
  project?: string;
  name: string;
  template?: string;
  steps?: string;
  content?: string;
  precondition?: string;
  expected?: string;
}

export async function createCase(args: CreateCaseArgs): Promise<void> {
  if (!args.name) throw new Error('--name is required');

  const projectIdStr = args.project ?? process.env.TESTINY_PROJECT_ID;
  if (!projectIdStr) {
    throw new Error('--project or TESTINY_PROJECT_ID env is required');
  }
  const projectId = parseInt(projectIdStr, 10);
  if (isNaN(projectId)) {
    throw new Error(`--project must be a numeric id, got: "${projectIdStr}"`);
  }

  const template: TestinyTemplate = (args.template as TestinyTemplate | undefined) ?? 'STEPS';
  if (template !== 'STEPS' && template !== 'TEXT') {
    throw new Error(`--template must be STEPS or TEXT, got: "${template}"`);
  }

  const body: Record<string, unknown> = {
    project_id: projectId,
    title: args.name,
    template,
  };

  if (template === 'STEPS') {
    if (args.steps) body.steps_text = args.steps;
    if (args.precondition) body.precondition_text = args.precondition;
    if (args.expected) body.expected_result_text = args.expected;
  } else {
    if (args.content) body.content_text = args.content;
  }

  const result = await request<TestinyTestCase>('POST', '/testcase', body);
  process.stdout.write(JSON.stringify(result, null, 2));
}
