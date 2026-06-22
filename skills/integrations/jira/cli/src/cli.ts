/**
 * jira-cli — CLI tool for interacting with Jira Cloud REST API v3
 * Used by agents for issue tracking and documentation research
 */

import { searchIssues, getIssue, createIssue, updateIssue, commentIssue, transitionIssue } from './commands/issue';
import { listProjects } from './commands/project';
import { listFields } from './commands/field';

/**
 * Parse CLI arguments into positional args and options
 * Supports repeated flags (e.g., --label "a" --label "b") by collecting into arrays
 */
function parseArgs(args: string[]): { positional: string[]; options: Record<string, string>; arrays: Record<string, string[]> } {
  const positional: string[] = [];
  const options: Record<string, string> = {};
  const arrays: Record<string, string[]> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        // Support repeated flags for array values
        if (key === 'label' || key === 'component') {
          if (!arrays[key]) arrays[key] = [];
          arrays[key].push(next);
        }
        options[key] = next;
        i++;
      } else {
        options[key] = 'true';
      }
    } else {
      positional.push(arg);
    }
  }

  return { positional, options, arrays };
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

const HELP = `jira-cli — Interact with Jira Cloud REST API v3

Usage:
  jira-cli <resource> <action> [options]

Resources & Actions:

  issue search    --jql "..." [--fields "summary,status"] [--limit N] [--start-at N]
  issue get       <KEY>       [--fields "..."] [--expand "transitions,changelog"]
  issue create    --project KEY --type Bug --summary "..." [--description "..."] [--priority "High"] [--assignee "accountId"] [--label "bug"] [--component "Auth"]
  issue update    <KEY>       [--summary "..."] [--assignee "accountId"]
  issue comment   <KEY>       --body "..." [--visibility-type role --visibility-value "Developers"]
  issue transition <KEY>      --to "Done"

  project list
  field list

Environment Variables:
  JIRA_CLOUD_TOKEN    Jira Cloud OAuth access token (required)
  JIRA_CLOUD_ID       Atlassian Cloud site ID (required)

Options:
  --help, -h        Show this help message`;

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(HELP);
    process.exit(0);
  }

  const { positional, options, arrays } = parseArgs(args);
  const resource = positional[0];
  const action = positional[1];

  // Handle resource-level help
  if (action === '--help' || action === '-h' || getOpt(options, 'help') === 'true') {
    console.log(HELP);
    process.exit(0);
  }

  try {
    switch (resource) {
      case 'issue':
        switch (action) {
          case 'search':
            await searchIssues({
              jql: getOpt(options, 'jql') || '',
              fields: getOpt(options, 'fields'),
              limit: getOpt(options, 'limit'),
              startAt: getOpt(options, 'start-at'),
            });
            break;
          case 'get':
            await getIssue(positional[2], {
              fields: getOpt(options, 'fields'),
              expand: getOpt(options, 'expand'),
            });
            break;
          case 'create': {
            // Support repeated --label and --component flags, or comma-separated --labels/--components
            let labels = arrays['label'] || [];
            const labelsOpt = getOpt(options, 'labels');
            if (labelsOpt) {
              labels = [...labels, ...labelsOpt.split(',').map((l) => l.trim())];
            }

            let components = arrays['component'] || [];
            const componentsOpt = getOpt(options, 'components');
            if (componentsOpt) {
              components = [...components, ...componentsOpt.split(',').map((c) => c.trim())];
            }

            await createIssue({
              project: getOpt(options, 'project') || '',
              type: getOpt(options, 'type') || '',
              summary: getOpt(options, 'summary') || '',
              description: getOpt(options, 'description'),
              priority: getOpt(options, 'priority'),
              assignee: getOpt(options, 'assignee'),
              labels: labels.length > 0 ? labels : undefined,
              components: components.length > 0 ? components : undefined,
            });
            break;
          }
          case 'update':
            await updateIssue(positional[2], {
              summary: getOpt(options, 'summary'),
              assignee: getOpt(options, 'assignee'),
            });
            break;
          case 'comment':
            await commentIssue(positional[2], getOpt(options, 'body') || '', {
              visibilityType: getOpt(options, 'visibility-type'),
              visibilityValue: getOpt(options, 'visibility-value'),
            });
            break;
          case 'transition':
            await transitionIssue(positional[2], getOpt(options, 'to') || '');
            break;
          default:
            console.error(`Unknown action: issue ${action || '(none)'}. Use --help for usage.`);
            process.exit(1);
        }
        break;

      case 'project':
        if (action === 'list') {
          await listProjects();
        } else {
          console.error(`Unknown action: project ${action || '(none)'}. Use --help for usage.`);
          process.exit(1);
        }
        break;

      case 'field':
        if (action === 'list') {
          await listFields();
        } else {
          console.error(`Unknown action: field ${action || '(none)'}. Use --help for usage.`);
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
