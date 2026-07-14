/**
 * azure-devops-cli — CLI tool for interacting with Azure DevOps Work Item Tracking API
 * Used by agents for issue tracking via the issue-tracker subagent
 */

import { listProjectsCommand } from './commands/list-projects';
import { searchCommand } from './commands/search';
import { getCommand } from './commands/get';
import { createCommand } from './commands/create';
import { updateCommand } from './commands/update';
import { commentCommand } from './commands/comment';
import { testPlanCommand } from './commands/test-plans';
import { testSuiteCommand } from './commands/test-suites';
import { testCaseCommand } from './commands/test-cases';
import { testPointCommand } from './commands/test-points';
import { testRunCommand } from './commands/test-runs';
import { testResultCommand } from './commands/test-results';

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

/**
 * Convert kebab-case to camelCase
 */
function camelCase(str: string): string {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

/**
 * Get option value, supporting both kebab-case and camelCase
 */
function getOpt(options: Record<string, string>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    if (options[key]) return options[key];
    const camel = camelCase(key);
    if (options[camel]) return options[camel];
  }
  return undefined;
}

const HELP = `azure-devops-cli — Interact with Azure DevOps Boards and Test Plans

Usage:
  azure-devops-cli <resource> <action> [options]

Resources & Actions:

  project list      [--top N] [--skip N]

  work-item search  --project "Name" --query "text or WIQL" [--type Bug] [--state Active] [--area-path "Project\\\\Area"] [--top 50]
  work-item get     <id> --project "Name" [--fields "System.Title,System.State"] [--expand All]
  work-item create  --project "Name" --type Bug --title "..." [--description "..."] [--area-path "..."] [--iteration-path "..."] [--priority N] [--severity "1 - Critical"] [--assigned-to "user@..."] [--tags "tag1; tag2"] [--parent-id 123]
  work-item update  <id> --project "Name" [--state "Resolved"] [--assignee "user@..."] [--priority N] [--title "..."] [--tags "..."] [--severity "..."] [--operations '[JSON Patch]']
  work-item comment <id> --project "Name" --body "Comment text (HTML supported)"

  test-plan list --project "Name" [--owner ID] [--active-only true] [--continuation-token TOKEN]
  test-plan get <id> --project "Name"
  test-plan create --project "Name" --name "..." [--area-path "..."] [--iteration "..."]
  test-plan update <id> --project "Name" [--name "..."] [--state Active]

  test-suite list --project "Name" --plan-id ID [--tree true] [--continuation-token TOKEN]
  test-suite get <id> --project "Name" --plan-id ID
  test-suite create --project "Name" --plan-id ID --parent-suite-id ID --name "..." [--suite-type staticTestSuite]
  test-suite update <id> --project "Name" --plan-id ID [--name "..."] [--parent-suite-id ID]
  test-suite add-cases <id> --project "Name" --plan-id ID --case-ids "1,2" [--configuration-ids "1,2"]
  test-suite remove-cases <id> --project "Name" --plan-id ID --case-ids "1,2"

  test-case list --project "Name" --plan-id ID --suite-id ID [--continuation-token TOKEN]
  test-case get <id> --project "Name"
  test-case create --project "Name" --title "..." --steps '[{"action":"...","expected":"..."}]'
  test-case update <id> --project "Name" [--title "..."] [--steps '[...]']

  test-point list --project "Name" --plan-id ID --suite-id ID [--case-id ID] [--continuation-token TOKEN]

  test-run list --project "Name" [--plan-id ID] [--top N] [--skip N]
  test-run get <id> --project "Name"
  test-run create --project "Name" --plan-id ID --point-ids "1,2" --name "..."
  test-run complete <id> --project "Name" [--comment "..."]

  test-result list --project "Name" --run-id ID [--top N] [--outcomes Passed,Failed]
  test-result get <id> --project "Name" --run-id ID
  test-result add --project "Name" --run-id ID --results '[{"testPointId":1,"outcome":"Passed"}]'
  test-result update <id> --project "Name" --run-id ID [--outcome Passed] [--comment "..."]
  test-result update --project "Name" --run-id ID --results '[{"id":100001,"outcome":"Failed"}]'

Environment Variables:
  AZURE_DEVOPS_ORG_URL    Azure DevOps organization URL (required)
  AZURE_DEVOPS_PAT        Personal Access Token (required)

Options:
  --help, -h        Show this help message`;

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(HELP);
    process.exit(0);
  }

  if (args[0] === '--version') {
    console.log('0.2.0');
    process.exit(0);
  }

  const { positional, options } = parseArgs(args);
  const resource = positional[0];
  const action = positional[1];

  // Handle resource-level help
  if (action === '--help' || action === '-h' || getOpt(options, 'help') === 'true') {
    console.log(HELP);
    process.exit(0);
  }

  try {
    switch (resource) {
      case 'project':
        if (action === 'list') {
          await listProjectsCommand({
            top: getOpt(options, 'top'),
            skip: getOpt(options, 'skip'),
          });
        } else {
          console.error(`Unknown action: project ${action || '(none)'}. Use --help for usage.`);
          process.exit(1);
        }
        break;

      case 'work-item':
        switch (action) {
          case 'search':
            await searchCommand({
              project: getOpt(options, 'project') || '',
              query: getOpt(options, 'query'),
              type: getOpt(options, 'type'),
              state: getOpt(options, 'state'),
              areaPath: getOpt(options, 'area-path'),
              top: getOpt(options, 'top'),
            });
            break;
          case 'get':
            await getCommand(positional[2], {
              project: getOpt(options, 'project') || '',
              fields: getOpt(options, 'fields'),
              expand: getOpt(options, 'expand'),
            });
            break;
          case 'create':
            await createCommand({
              project: getOpt(options, 'project') || '',
              type: getOpt(options, 'type') || '',
              title: getOpt(options, 'title') || '',
              description: getOpt(options, 'description'),
              areaPath: getOpt(options, 'area-path'),
              iterationPath: getOpt(options, 'iteration-path'),
              assignedTo: getOpt(options, 'assigned-to'),
              priority: getOpt(options, 'priority'),
              severity: getOpt(options, 'severity'),
              tags: getOpt(options, 'tags'),
              parentId: getOpt(options, 'parent-id'),
            });
            break;
          case 'update':
            await updateCommand(positional[2], {
              project: getOpt(options, 'project') || '',
              state: getOpt(options, 'state'),
              assignee: getOpt(options, 'assignee'),
              priority: getOpt(options, 'priority'),
              title: getOpt(options, 'title'),
              tags: getOpt(options, 'tags'),
              severity: getOpt(options, 'severity'),
              operations: getOpt(options, 'operations'),
            });
            break;
          case 'comment':
            await commentCommand(positional[2], {
              project: getOpt(options, 'project') || '',
              body: getOpt(options, 'body') || '',
            });
            break;
          default:
            console.error(`Unknown action: work-item ${action || '(none)'}. Use --help for usage.`);
            process.exit(1);
        }
        break;

      case 'test-plan':
        await testPlanCommand(action, positional[2], {
          project: getOpt(options, 'project') || '',
          name: getOpt(options, 'name'),
          areaPath: getOpt(options, 'area-path'),
          iteration: getOpt(options, 'iteration'),
          description: getOpt(options, 'description'),
          state: getOpt(options, 'state'),
          startDate: getOpt(options, 'start-date'),
          endDate: getOpt(options, 'end-date'),
          owner: getOpt(options, 'owner'),
          continuationToken: getOpt(options, 'continuation-token'),
          includeDetails: getOpt(options, 'include-details'),
          activeOnly: getOpt(options, 'active-only'),
        });
        break;

      case 'test-suite':
        await testSuiteCommand(action, positional[2], {
          project: getOpt(options, 'project') || '',
          planId: getOpt(options, 'plan-id'),
          name: getOpt(options, 'name'),
          parentSuiteId: getOpt(options, 'parent-suite-id'),
          suiteType: getOpt(options, 'suite-type'),
          query: getOpt(options, 'query'),
          requirementId: getOpt(options, 'requirement-id'),
          configurationIds: getOpt(options, 'configuration-ids'),
          inheritConfigurations: getOpt(options, 'inherit-configurations'),
          continuationToken: getOpt(options, 'continuation-token'),
          expand: getOpt(options, 'expand'),
          tree: getOpt(options, 'tree'),
          revision: getOpt(options, 'revision'),
          caseIds: getOpt(options, 'case-ids'),
        });
        break;

      case 'test-case':
        await testCaseCommand(action, positional[2], {
          project: getOpt(options, 'project') || '',
          planId: getOpt(options, 'plan-id'),
          suiteId: getOpt(options, 'suite-id'),
          title: getOpt(options, 'title'),
          steps: getOpt(options, 'steps'),
          priority: getOpt(options, 'priority'),
          areaPath: getOpt(options, 'area-path'),
          iterationPath: getOpt(options, 'iteration-path'),
          tags: getOpt(options, 'tags'),
          state: getOpt(options, 'state'),
          continuationToken: getOpt(options, 'continuation-token'),
          configurationIds: getOpt(options, 'configuration-ids'),
        });
        break;

      case 'test-point':
        await testPointCommand(action, {
          project: getOpt(options, 'project') || '',
          planId: getOpt(options, 'plan-id'),
          suiteId: getOpt(options, 'suite-id'),
          caseId: getOpt(options, 'case-id'),
          pointIds: getOpt(options, 'point-ids'),
          continuationToken: getOpt(options, 'continuation-token'),
          includeDetails: getOpt(options, 'include-details'),
          recursive: getOpt(options, 'recursive'),
        });
        break;

      case 'test-run':
        await testRunCommand(action, positional[2], {
          project: getOpt(options, 'project') || '',
          planId: getOpt(options, 'plan-id'),
          pointIds: getOpt(options, 'point-ids'),
          name: getOpt(options, 'name'),
          comment: getOpt(options, 'comment'),
          automated: getOpt(options, 'automated'),
          top: getOpt(options, 'top'),
          skip: getOpt(options, 'skip'),
          minLastUpdated: getOpt(options, 'min-last-updated'),
          maxLastUpdated: getOpt(options, 'max-last-updated'),
          completedDate: getOpt(options, 'completed-date'),
        });
        break;

      case 'test-result':
        await testResultCommand(action, positional[2], {
          project: getOpt(options, 'project') || '',
          runId: getOpt(options, 'run-id'),
          results: getOpt(options, 'results'),
          top: getOpt(options, 'top'),
          skip: getOpt(options, 'skip'),
          outcomes: getOpt(options, 'outcomes'),
          details: getOpt(options, 'details'),
          outcome: getOpt(options, 'outcome'),
          state: getOpt(options, 'state'),
          durationMs: getOpt(options, 'duration-ms'),
          comment: getOpt(options, 'comment'),
          errorMessage: getOpt(options, 'error-message'),
          startedDate: getOpt(options, 'started-date'),
          completedDate: getOpt(options, 'completed-date'),
        });
        break;

      default:
        console.error(`Unknown resource: ${resource}. Use --help for usage.`);
        process.exit(1);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ error: message }));
    process.exitCode = 1;
  }
}

main();
