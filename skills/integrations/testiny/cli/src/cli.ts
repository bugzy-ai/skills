import { createCase } from './commands/create-case';
import { getCase } from './commands/get-case';
import { updateCase } from './commands/update-case';
import { listCases } from './commands/list-cases';
import { createPlan } from './commands/create-plan';
import { getPlan } from './commands/get-plan';
import { updatePlan } from './commands/update-plan';
import { listPlans } from './commands/list-plans';

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
testiny-cli — Testiny REST API CLI

Usage:
  testiny-cli <command> [options]

Commands:
  create-case    Create a test case
  get-case       Get a test case by numeric id
  update-case    Update a test case (handles _etag concurrency)
  list-cases     List test cases for a project
  create-plan    Create a test plan
  get-plan       Get a test plan by numeric id
  update-plan    Update a test plan (handles _etag concurrency)
  list-plans     List test plans for a project

Options:
  --version      Show version
  --help         Show this help

create-case:
  --project <id>            Numeric project id (defaults to TESTINY_PROJECT_ID env)
  --name <string>           Test case title (required)
  --template <STEPS|TEXT>   Default: STEPS
  --steps <string>          Steps body (STEPS template) — free-form, supports \\n
  --content <string>        Content body (TEXT template) — free-form markdown
  --precondition <string>   Setup requirements (STEPS template)
  --expected <string>       Expected result (STEPS template)

get-case:
  --id <number>             Numeric test case id (required)

update-case:
  --id <number>             Numeric test case id (required)
  --name <string>           New title
  --template <STEPS|TEXT>   Change template
  --steps <string>          Replace steps_text (STEPS)
  --content <string>        Replace content_text (TEXT)
  --precondition <string>   Replace precondition_text
  --expected <string>       Replace expected_result_text

list-cases:
  --project <id>            Numeric project id (defaults to TESTINY_PROJECT_ID env)
  --limit <n>               Max results (default: 50)

create-plan:
  --project <id>             Numeric project id (defaults to TESTINY_PROJECT_ID env)
  --name <string>            Plan name (required)
  --description <string>     Plan description / scope (optional, supports markdown)
  --description-file <path>  Read description from a file (mutually exclusive with --description)
  --chunked                  When description > 16K (Testiny's limit), split into multiple
                             linked plans at section boundaries (## then ### then lines).
                             Each part is titled "<name> (Part N of M)".

get-plan:
  --id <number>             Numeric test plan id (required)

update-plan:
  --id <number>             Numeric test plan id (required)
  --name <string>           New name
  --description <string>    New description

list-plans:
  --project <id>            Numeric project id (defaults to TESTINY_PROJECT_ID env)
  --limit <n>               Max results (default: 50)

Environment:
  TESTINY_API_KEY           Testiny API key (required; sent as X-Api-Key header)
  TESTINY_PROJECT_ID        Default numeric project id (optional)
  TESTINY_APP_URL           Base URL (default: https://app.testiny.io)

Notes:
  - Folder support is not yet shipped; cases/plans land at project root.
  - update-* fetches the resource first to capture _etag (required by Testiny).
  - Duplicate titles/names are allowed; agents should search before create when needed.
  - For Playwright run upload, use the official @testiny/cli automation importer
    (\`npx --package=@testiny/cli@latest testiny-importer automation ...\`) —
    TestRun CRUD is not exposed here.
  - Testiny limits TestPlan.description to 16,000 chars. Use --chunked on
    create-plan to migrate larger plans by splitting at section boundaries.
`.trim();

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
    process.stdout.write('0.2.2');
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
    case 'update-case':
      await updateCase(cmdArgs);
      break;
    case 'list-cases':
      await listCases(cmdArgs);
      break;
    case 'create-plan':
      await createPlan(cmdArgs);
      break;
    case 'get-plan':
      await getPlan(cmdArgs);
      break;
    case 'update-plan':
      await updatePlan(cmdArgs);
      break;
    case 'list-plans':
      await listPlans(cmdArgs);
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
