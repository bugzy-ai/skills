/**
 * notion-cli — CLI for Notion REST API
 * Used by Bugzy agents for documentation research and issue tracking
 * Zero runtime dependencies, JSON-only output
 */

import { search } from './commands/search';
import { getPage, createPage, updatePage } from './commands/page';
import { getDatabase, queryDatabase } from './commands/database';

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

const HELP = `notion-cli — Notion REST API CLI

Usage:
  notion-cli <resource> <action> [options]

Resources & Actions:

  search         --query "text" [--filter page|database] [--limit N]
  page get       <page-id>
  page create    --parent <database-id> --title "..." [--properties '{"Status":...}']
  page update    <page-id> --properties '{"Status":...}'
  database get   <database-id>
  database query <database-id> [--filter '{"property":"Status",...}'] [--limit N]

Environment Variables:
  NOTION_TOKEN   Notion integration token (required)

Options:
  --help, -h     Show this help message`;

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
      case 'search': {
        const query = getOpt(options, 'query');
        if (!query) {
          console.error(JSON.stringify({ error: 'search requires --query. Use --help for usage.' }));
          process.exit(1);
        }
        const filter = getOpt(options, 'filter');
        const limit = getOpt(options, 'limit');
        await search(query, filter, limit);
        break;
      }

      case 'page':
        switch (action) {
          case 'get':
            await getPage(positional[2]);
            break;
          case 'create':
            await createPage(
              getOpt(options, 'parent') || '',
              getOpt(options, 'title') || '',
              getOpt(options, 'properties')
            );
            break;
          case 'update':
            await updatePage(
              positional[2],
              getOpt(options, 'properties') || ''
            );
            break;
          default:
            console.error(JSON.stringify({ error: `Unknown action: page ${action || '(none)'}. Use --help for usage.` }));
            process.exit(1);
        }
        break;

      case 'database':
        switch (action) {
          case 'get':
            await getDatabase(positional[2]);
            break;
          case 'query':
            await queryDatabase(
              positional[2],
              getOpt(options, 'filter'),
              getOpt(options, 'limit')
            );
            break;
          default:
            console.error(JSON.stringify({ error: `Unknown action: database ${action || '(none)'}. Use --help for usage.` }));
            process.exit(1);
        }
        break;

      default:
        console.error(JSON.stringify({ error: `Unknown resource: ${resource}. Use --help for usage.` }));
        process.exit(1);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ error: message }));
    process.exit(1);
  }
}

export { main };

// Errors are already handled inside main() (JSON output + process.exit)
main().catch(() => {});
