/**
 * linear-cli — CLI tool for interacting with Linear's GraphQL API
 */

import {
  searchIssues,
  getIssue,
  createIssue,
  updateIssue,
  documentUpsertIssue,
  commentIssue,
  relateIssue,
} from './commands/issue';
import { listTeams } from './commands/team';
import { getProject, listProjects } from './commands/project';
import { listStates } from './commands/state';
import { listLabels } from './commands/label';
import { createOutputFormatter } from './output';

export type ParsedOptions = Record<string, string[]>;

/**
 * Parse CLI arguments into positional args and options.
 * Repeated flags accumulate into arrays — `--label A --label B` → `{ label: ['A','B'] }`.
 */
function parseArgs(args: string[]): { positional: string[]; options: ParsedOptions } {
  const positional: string[] = [];
  const options: ParsedOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      let value: string;
      if (next && !next.startsWith('--')) {
        value = next;
        i++;
      } else {
        value = 'true';
      }
      const bucket = options[key] ?? (options[key] = []);
      bucket.push(value);
    } else {
      positional.push(arg);
    }
  }

  return { positional, options };
}

function camelCase(str: string): string {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

/** Return the first value for any of the given flag names. */
function getOpt(options: ParsedOptions, ...keys: string[]): string | undefined {
  for (const key of keys) {
    if (options[key]?.length) return options[key][0];
    const camel = camelCase(key);
    if (options[camel]?.length) return options[camel][0];
  }
  return undefined;
}

/** Return all values for any of the given flag names, flattened in argv order. */
function getAll(options: ParsedOptions, ...keys: string[]): string[] {
  const out: string[] = [];
  for (const key of keys) {
    if (options[key]?.length) out.push(...options[key]);
    const camel = camelCase(key);
    if (camel !== key && options[camel]?.length) out.push(...options[camel]);
  }
  return out;
}

const HELP = `linear-cli — Interact with Linear's GraphQL API

Usage:
  linear-cli <resource> <action> [options]

Resources & Actions:

  issue search    --query "text" [--team KEY] [--state "Name"] [--label "Name" ...] [--limit N]
  issue get       <identifier>        (e.g., ENG-123 or UUID)
  issue create    --team KEY --title "..." [--description "..." | --description-file path]
                  [--priority 0..4] [--label "Name" ...] [--state "Name"] [--project "Name"]
  issue update    <identifier> [--state "Name"] [--priority 0..4] [--assignee email]
                  [--title "..."] [--description "..." | --description-file path]
                  [--label "Name" ...] [--project "Name"]
  issue comment   <identifier> --body "..." | --body-file path
  issue document-upsert <identifier> --title "..." --content-file path
  issue relate    <identifier> --blocks <other> | --related <other>

  team list
  project list    [--team KEY]
  project get     <name-or-id>
  state list      --team KEY
  label list      [--team KEY]

Environment Variables:
  LINEAR_API_KEY    Linear API key or OAuth token (required)

Options:
  --json            Output raw JSON
  --help, -h        Show this help message

Notes:
  --priority accepts Linear-native values 0..4.
  --label is repeatable (--label A --label B --label C). Duplicates are de-duped
  by resolved label id. On 'issue update', labelIds REPLACES the issue's labels.`;

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(HELP);
    process.exit(0);
    return;
  }

  const { positional, options } = parseArgs(args);
  const resource = positional[0];
  const action = positional[1];
  const output = createOutputFormatter(getOpt(options, 'json') === 'true' ? 'json' : 'compact');

  if (action === '--help' || action === '-h' || getOpt(options, 'help') === 'true') {
    console.log(HELP);
    process.exit(0);
    return;
  }

  try {
    switch (resource) {
      case 'issue':
        switch (action) {
          case 'search':
            await searchIssues({
              query: getOpt(options, 'query'),
              team: getOpt(options, 'team'),
              state: getOpt(options, 'state'),
              labels: getAll(options, 'label'),
              limit: getOpt(options, 'limit'),
            }, output);
            break;
          case 'get':
            await getIssue(positional[2], output);
            break;
          case 'create':
            await createIssue({
              team: getOpt(options, 'team') || '',
              title: getOpt(options, 'title') || '',
              description: getOpt(options, 'description'),
              descriptionFile: getOpt(options, 'description-file'),
              priority: getOpt(options, 'priority'),
              labels: getAll(options, 'label'),
              state: getOpt(options, 'state'),
              project: getOpt(options, 'project'),
            }, output);
            break;
          case 'update':
            await updateIssue(positional[2], {
              state: getOpt(options, 'state'),
              priority: getOpt(options, 'priority'),
              assignee: getOpt(options, 'assignee'),
              title: getOpt(options, 'title'),
              description: getOpt(options, 'description'),
              descriptionFile: getOpt(options, 'description-file'),
              labels: getAll(options, 'label'),
              project: getOpt(options, 'project'),
            }, output);
            break;
          case 'comment':
            await commentIssue(positional[2], {
              body: getOpt(options, 'body'),
              bodyFile: getOpt(options, 'body-file'),
            }, output);
            break;
          case 'document-upsert':
            await documentUpsertIssue(positional[2], {
              title: getOpt(options, 'title') || '',
              contentFile: getOpt(options, 'content-file') || '',
            }, output);
            break;
          case 'relate':
            await relateIssue(positional[2], {
              blocks: getOpt(options, 'blocks'),
              related: getOpt(options, 'related'),
            }, output);
            break;
          default:
            output.error(`Unknown action: issue ${action || '(none)'}. Use --help for usage.`);
            process.exit(1);
        }
        break;

      case 'team':
        if (action === 'list') {
          await listTeams(output);
        } else {
          output.error(`Unknown action: team ${action || '(none)'}. Use --help for usage.`);
          process.exit(1);
        }
        break;

      case 'project':
        if (action === 'list') {
          await listProjects(getOpt(options, 'team'), output);
        } else if (action === 'get') {
          await getProject(positional[2], output);
        } else {
          output.error(`Unknown action: project ${action || '(none)'}. Use --help for usage.`);
          process.exit(1);
        }
        break;

      case 'state':
        if (action === 'list') {
          await listStates(getOpt(options, 'team') || '', output);
        } else {
          output.error(`Unknown action: state ${action || '(none)'}. Use --help for usage.`);
          process.exit(1);
        }
        break;

      case 'label':
        if (action === 'list') {
          await listLabels(getOpt(options, 'team'), output);
        } else {
          output.error(`Unknown action: label ${action || '(none)'}. Use --help for usage.`);
          process.exit(1);
        }
        break;

      default:
        output.error(`Unknown resource: ${resource}. Use --help for usage.`);
        process.exit(1);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    output.error(message);
    process.exit(1);
  }
}

main();
