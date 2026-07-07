/**
 * zephyr-cli — CLI tool for interacting with the Zephyr Scale Cloud REST API v2
 * Used by agents for test case management
 */

import { createCase } from './commands/create-case';
import { getCase } from './commands/get-case';
import { getSteps } from './commands/get-steps';
import { updateCase } from './commands/update-case';
import { listCases } from './commands/list-cases';
import { listFolders } from './commands/list-folders';
import { createFolder } from './commands/create-folder';
import { ensurePlan } from './commands/ensure-plan';
import { ensureCycle } from './commands/ensure-cycle';
import { linkPlanCycle } from './commands/link-plan-cycle';
import { recordExecution } from './commands/record-execution';

/**
 * Parse CLI arguments into positional args and options
 */
function parseArgs(args: string[]): { positional: string[]; options: Record<string, string> } {
  const positional: string[] = [];
  const options: Record<string, string> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        options[key] = next;
        i++;
      } else {
        options[key] = 'true';
      }
    } else {
      positional.push(arg);
    }
  }

  return { positional, options };
}

const HELP = `
zephyr-cli — Zephyr Scale Cloud REST API CLI

Usage:
  zephyr-cli <command> [options]

Commands:
  create-case    Create a test case
  get-case       Get a test case by key
  get-steps      Get test steps for a test case
  update-case    Update a test case
  list-cases     List test cases in a project
  list-folders   List test case folders in a project
  create-folder  Create a folder
  ensure-plan    Create or reuse a release test plan
  ensure-cycle   Create or reuse a release-linked test cycle
  link-plan-cycle Link a test cycle to a test plan
  record-execution Record a test execution with release metadata

Options:
  --version      Show version
  --help         Show this help

create-case:
  --project <key>       Project key (required)
  --name <string>       Test case name (required)
  --folder <id>         Folder ID (required — cases without a folder are invisible in Zephyr UI)
  --objective <string>  What the test verifies
  --precondition <str>  Setup requirements
  --labels <csv>        Comma-separated labels
  --priority <string>   Priority name (High, Normal, Low)
  --status <string>     Status name (Draft, Approved)
  --steps <json>        Steps as JSON array

get-case:
  --key <key>           Test case key, e.g. PROJ-T42 (required)

get-steps:
  --key <key>           Test case key (required)

update-case:
  --key <key>           Test case key (required)
  --name <string>       New test case name
  --folder <id>         Move to folder by ID
  --objective <string>  What the test verifies
  --precondition <str>  Setup requirements
  --labels <csv>        Comma-separated labels
  --priority <string>   Priority name (High, Normal, Low)
  --status <string>     Status name (Draft, Approved)

list-cases:
  --project <key>       Project key (required)
  --folder <id>         Filter by folder ID
  --max-results <n>     Max results (default: 50)
  --start-at <n>        Pagination offset (default: 0)

list-folders:
  --project <key>       Project key (required)

create-folder:
  --project <key>       Project key (required)
  --name <string>       Folder name (required)
  --type <type>         TEST_CASE | TEST_CYCLE | TEST_PLAN (required)

ensure-plan:
  --project <key>       Project key (required)
  --release <string>    Platform release number; default name is "<release> Release Test Plan"
  --name <string>       Explicit test plan name
  --folder <id>         Folder ID
  --status <string>     Status name

ensure-cycle:
  --project <key>       Project key (required)
  --name <string>       Test cycle name (required)
  --jira-project-version-id <id> Jira Project Version ID from jira-cli (required)
  --planned-start-date <date> Planned start date (required)
  --planned-end-date <date> Planned end date (required)
  --description <string> Test cycle description
  --folder <id>         Folder ID
  --status <string>     Status name

link-plan-cycle:
  --plan <key|id>       Test plan key or ID (required)
  --cycle <key|id>      Test cycle key or ID (required)

record-execution:
  --project <key>       Project key (required)
  --test-case <key>     Test case key (required)
  --test-cycle <key>    Test cycle key (required)
  --status <string>     Execution status name (required)
  --release <string>    Platform release number (required)
  --revision <string>   Platform revision (required)
  --environment <name>  Environment name
  --actual-end-date <date> Actual end date
  --execution-time <ms> Execution time in milliseconds
  --comment <string>    Additional execution comment

Environment:
  ZEPHYR_API_TOKEN      Zephyr Scale API token (required)
`.trim();

/**
 * Normalize kebab-case option keys to camelCase for command handlers
 */
function normalizeOptions(options: Record<string, string>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(options)) {
    const camelKey = key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    normalized[camelKey] = value;
  }
  return normalized;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const { positional, options } = parseArgs(args);

  if (options.version) {
    process.stdout.write('0.1.0');
    return;
  }

  if (options.help || positional.length === 0) {
    console.log(HELP);
    return;
  }

  const command = positional[0];
  const opts = normalizeOptions(options);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cmdArgs = opts as any;
  switch (command) {
    case 'create-case':
      await createCase(cmdArgs);
      break;
    case 'get-case':
      await getCase(cmdArgs);
      break;
    case 'get-steps':
      await getSteps(cmdArgs);
      break;
    case 'update-case':
      await updateCase(cmdArgs);
      break;
    case 'list-cases':
      await listCases(cmdArgs);
      break;
    case 'list-folders':
      await listFolders(cmdArgs);
      break;
    case 'create-folder':
      await createFolder(cmdArgs);
      break;
    case 'ensure-plan':
      await ensurePlan(cmdArgs);
      break;
    case 'ensure-cycle':
      await ensureCycle(cmdArgs);
      break;
    case 'link-plan-cycle':
      await linkPlanCycle(cmdArgs);
      break;
    case 'record-execution':
      await recordExecution(cmdArgs);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.log(HELP);
      process.exit(1);
  }
}

main().catch((err: Error) => {
  console.error(JSON.stringify({ error: err.message }));
  process.exit(1);
});
