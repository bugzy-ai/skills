/**
 * clickup-cli — CLI tool for interacting with ClickUp's REST API v2
 * Used by agents for issue tracking
 */

import { searchTasks, getTask, createTask, updateTask, commentTask } from './commands/task';
import { listSpaces } from './commands/space';
import { listLists } from './commands/list';
import { listStatuses } from './commands/status';
import { listWorkspaces } from './commands/workspace';

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

const HELP = `clickup-cli — Interact with ClickUp's REST API v2

Usage:
  clickup-cli <resource> <action> [options]

Resources & Actions:

  task search     [--query "text"] [--space SPACE_ID] [--list LIST_ID] [--status "name"] [--assignee USER_ID] [--limit N] [--page N]
  task get        <task_id>
  task create     --list LIST_ID --name "..." [--description "..."] [--priority N] [--status "name"] [--assignee USER_ID]
  task update     <task_id> [--name "..."] [--status "name"] [--priority N] [--description "..."] [--assignee USER_ID]
  task comment    <task_id> --body "..."

  space list
  list list       --space SPACE_ID
  status list     --list LIST_ID
  workspace list

Environment Variables:
  CLICKUP_API_TOKEN   ClickUp API token or OAuth access token (required)
  CLICKUP_TEAM_ID     ClickUp workspace (team) ID (required for search)

Options:
  --help, -h        Show this help message

Notes:
  Priority values: 1=Urgent, 2=High, 3=Normal, 4=Low
  Statuses are per-list — use "status list --list LIST_ID" to discover available statuses`;

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(HELP);
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
      case 'task':
        switch (action) {
          case 'search':
            await searchTasks({
              query: getOpt(options, 'query'),
              list: getOpt(options, 'list'),
              space: getOpt(options, 'space'),
              status: getOpt(options, 'status'),
              assignee: getOpt(options, 'assignee'),
              limit: getOpt(options, 'limit'),
              page: getOpt(options, 'page'),
            });
            break;
          case 'get':
            await getTask(positional[2]);
            break;
          case 'create':
            await createTask({
              list: getOpt(options, 'list') || '',
              name: getOpt(options, 'name') || '',
              description: getOpt(options, 'description'),
              status: getOpt(options, 'status'),
              priority: getOpt(options, 'priority'),
              assignee: getOpt(options, 'assignee'),
            });
            break;
          case 'update':
            await updateTask(positional[2], {
              name: getOpt(options, 'name'),
              description: getOpt(options, 'description'),
              status: getOpt(options, 'status'),
              priority: getOpt(options, 'priority'),
              assignee: getOpt(options, 'assignee'),
            });
            break;
          case 'comment':
            await commentTask(positional[2], getOpt(options, 'body') || '');
            break;
          default:
            console.error(`Unknown action: task ${action || '(none)'}. Use --help for usage.`);
            process.exit(1);
        }
        break;

      case 'space':
        if (action === 'list') {
          await listSpaces();
        } else {
          console.error(`Unknown action: space ${action || '(none)'}. Use --help for usage.`);
          process.exit(1);
        }
        break;

      case 'list':
        if (action === 'list') {
          await listLists(getOpt(options, 'space') || '');
        } else {
          console.error(`Unknown action: list ${action || '(none)'}. Use --help for usage.`);
          process.exit(1);
        }
        break;

      case 'status':
        if (action === 'list') {
          await listStatuses(getOpt(options, 'list') || '');
        } else {
          console.error(`Unknown action: status ${action || '(none)'}. Use --help for usage.`);
          process.exit(1);
        }
        break;

      case 'workspace':
        if (action === 'list') {
          await listWorkspaces();
        } else {
          console.error(`Unknown action: workspace ${action || '(none)'}. Use --help for usage.`);
          process.exit(1);
        }
        break;

      default:
        console.error(`Unknown resource: ${resource}. Use --help for usage.`);
        process.exit(1);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ error: message }));
    process.exit(1);
  }
}

main();
