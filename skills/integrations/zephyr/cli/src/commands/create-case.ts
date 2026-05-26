import { request } from '../client';
import type { ZephyrTestCase, ZephyrTestStepInput } from '../types';

interface CreateCaseArgs {
  project: string;
  name: string;
  folder: string;
  objective?: string;
  precondition?: string;
  labels?: string; // comma-separated
  priority?: string; // e.g. "High", "Normal", "Low"
  status?: string; // e.g. "Draft", "Approved"
  steps?: string; // JSON string of ZephyrTestStepInput[]
}

export async function createCase(args: CreateCaseArgs): Promise<void> {
  if (!args.project) throw new Error('--project is required');
  if (!args.name) throw new Error('--name is required');
  // Folder is required — test cases without a folder are invisible in the Zephyr Scale UI sidebar
  if (!args.folder) throw new Error('--folder is required (cases without a folder are invisible in the Zephyr UI)');

  const folderId = parseInt(args.folder, 10);
  if (isNaN(folderId)) throw new Error(`--folder must be a numeric ID, got: "${args.folder}"`);

  const body: Record<string, unknown> = {
    projectKey: args.project,
    name: args.name,
    folderId,
  };

  if (args.objective) body.objective = args.objective;
  if (args.precondition) body.precondition = args.precondition;
  if (args.labels) body.labels = args.labels.split(',').map((l) => l.trim());
  if (args.priority) body.priorityName = args.priority;
  if (args.status) body.statusName = args.status;

  const result = await request<ZephyrTestCase>('POST', '/testcases', body);

  // Steps must be added via separate endpoint — the create payload ignores them
  if (args.steps) {
    const steps: ZephyrTestStepInput[] = JSON.parse(args.steps);
    await request('POST', `/testcases/${result.key}/teststeps`, {
      mode: 'OVERWRITE',
      items: steps.map((s) => ({
        inline: {
          description: s.description,
          testData: s.testData || '',
          expectedResult: s.expectedResult || '',
        },
      })),
    });
  }

  process.stdout.write(JSON.stringify(result, null, 2));
}
