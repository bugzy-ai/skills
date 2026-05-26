/**
 * zephyr-cli — CLI tool for interacting with the Zephyr Scale Cloud REST API v2
 * Used by Bugzy agents for test case management
 */

import { createCase } from './commands/create-case';
import { getCase } from './commands/get-case';
import { getSteps } from './commands/get-steps';
import { updateCase } from './commands/update-case';
import { listCases } from './commands/list-cases';
import { listFolders } from './commands/list-folders';
import { createFolder } from './commands/create-folder';

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
