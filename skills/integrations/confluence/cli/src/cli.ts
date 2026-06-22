/**
 * confluence-cli — Read-only CLI for Confluence Cloud REST API
 * Used by agents for documentation research
 * Zero runtime dependencies, JSON-only output
 */

import { listSpaces } from './commands/space';
import { getPage, listChildren } from './commands/page';
import { searchCQL, searchText } from './commands/search';

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

const HELP = `confluence-cli — Read-only Confluence documentation CLI

Usage:
  confluence-cli <resource> <action> [options]

Resources & Actions:

  space list
  page get       <page-id>
  page children  <page-id> [--limit N]
  search         --cql "CQL query" [--limit N]
  search         --query "text" [--limit N]

Environment Variables:
  CONFLUENCE_ACCESS_TOKEN   OAuth token (required)
  CONFLUENCE_CLOUD_ID       Atlassian Cloud site ID (required)

Options:
  --help, -h        Show this help message`;

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
      case 'space':
        if (action === 'list') {
          await listSpaces();
        } else {
          console.error(JSON.stringify({ error: `Unknown action: space ${action || '(none)'}. Use --help for usage.` }));
          process.exit(1);
        }
        break;

      case 'page':
        switch (action) {
          case 'get':
            await getPage(positional[2]);
            break;
          case 'children':
            await listChildren(positional[2], getOpt(options, 'limit'));
            break;
          default:
            console.error(JSON.stringify({ error: `Unknown action: page ${action || '(none)'}. Use --help for usage.` }));
            process.exit(1);
        }
        break;

      case 'search': {
        const cql = getOpt(options, 'cql');
        const query = getOpt(options, 'query');
        const limit = getOpt(options, 'limit');

        if (cql) {
          await searchCQL(cql, limit);
        } else if (query) {
          await searchText(query, limit);
        } else {
          console.error(JSON.stringify({ error: 'search requires --cql or --query. Use --help for usage.' }));
          process.exit(1);
        }
        break;
      }

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
