/**
 * azure-devops-cli — CLI tool for interacting with Azure DevOps Work Item Tracking API
 * Used by Bugzy agents for issue tracking via the issue-tracker subagent
 */

import { listProjectsCommand } from './commands/list-projects';
import { searchCommand } from './commands/search';
import { getCommand } from './commands/get';
import { createCommand } from './commands/create';
import { updateCommand } from './commands/update';
import { commentCommand } from './commands/comment';

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

const HELP = `azure-devops-cli — Interact with Azure DevOps Work Item Tracking API

Usage:
  azure-devops-cli <resource> <action> [options]

Resources & Actions:

  project list      [--top N] [--skip N]

  work-item search  --project "Name" --query "text or WIQL" [--type Bug] [--state Active] [--area-path "Project\\\\Area"] [--top 50]
  work-item get     <id> --project "Name" [--fields "System.Title,System.State"] [--expand All]
  work-item create  --project "Name" --type Bug --title "..." [--description "..."] [--area-path "..."] [--iteration-path "..."] [--priority N] [--severity "1 - Critical"] [--assigned-to "user@..."] [--tags "tag1; tag2"] [--parent-id 123]
  work-item update  <id> --project "Name" [--state "Resolved"] [--assignee "user@..."] [--priority N] [--title "..."] [--tags "..."] [--severity "..."] [--operations '[JSON Patch]']
  work-item comment <id> --project "Name" --body "Comment text (HTML supported)"

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
    console.log('0.1.0');
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
