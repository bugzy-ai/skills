import { request } from '../client';
import type { TestinyTestCase, TestinyTemplate } from '../types';

interface UpdateCaseArgs {
  id: string;
  name?: string;
  template?: string;
  steps?: string;
  content?: string;
  precondition?: string;
  expected?: string;
}

export async function updateCase(args: UpdateCaseArgs): Promise<void> {
  if (!args.id) throw new Error('--id is required');
  const id = parseInt(args.id, 10);
  if (isNaN(id)) throw new Error(`--id must be numeric, got: "${args.id}"`);

  // GET first to capture _etag — Testiny enforces optimistic concurrency on PUT
  const existing = await request<TestinyTestCase>('GET', `/testcase/${id}`);

  const body: Record<string, unknown> = { _etag: existing._etag };

  if (args.name !== undefined) body.title = args.name;

  if (args.template !== undefined) {
    if (args.template !== 'STEPS' && args.template !== 'TEXT') {
      throw new Error(`--template must be STEPS or TEXT, got: "${args.template}"`);
    }
    body.template = args.template as TestinyTemplate;
  }

  if (args.steps !== undefined) body.steps_text = args.steps;
  if (args.content !== undefined) body.content_text = args.content;
  if (args.precondition !== undefined) body.precondition_text = args.precondition;
  if (args.expected !== undefined) body.expected_result_text = args.expected;

  const result = await request<TestinyTestCase>('PUT', `/testcase/${id}`, body);
  process.stdout.write(JSON.stringify(result, null, 2));
}
