import { request } from '../client';

interface RecordExecutionArgs {
  project: string;
  testCase: string;
  testCycle: string;
  status: string;
  release: string;
  revision: string;
  environment?: string;
  actualEndDate?: string;
  executionTime?: string;
  comment?: string;
}

function executionComment(args: RecordExecutionArgs): string {
  const metadata = `Platform release: ${args.release}\nPlatform revision: ${args.revision}`;
  return args.comment ? `${metadata}\n\n${args.comment}` : metadata;
}

function parseExecutionTime(value: string): number {
  const executionTime = Number(value);
  if (!Number.isInteger(executionTime) || executionTime < 0) {
    throw new Error('--execution-time must be a non-negative integer');
  }
  return executionTime;
}

export async function recordExecution(args: RecordExecutionArgs): Promise<void> {
  if (!args.project) throw new Error('--project is required');
  if (!args.testCase) throw new Error('--test-case is required');
  if (!args.testCycle) throw new Error('--test-cycle is required');
  if (!args.status) throw new Error('--status is required');
  if (!args.release) throw new Error('--release is required');
  if (!args.revision) throw new Error('--revision is required');

  const body: Record<string, unknown> = {
    projectKey: args.project,
    testCaseKey: args.testCase,
    testCycleKey: args.testCycle,
    statusName: args.status,
    comment: executionComment(args),
  };
  if (args.environment) body.environmentName = args.environment;
  if (args.actualEndDate) body.actualEndDate = args.actualEndDate;
  if (args.executionTime) body.executionTime = parseExecutionTime(args.executionTime);

  const result = await request<Record<string, unknown>>('POST', '/testexecutions', body);
  process.stdout.write(JSON.stringify(Object.keys(result).length ? result : { recorded: true }, null, 2));
}
