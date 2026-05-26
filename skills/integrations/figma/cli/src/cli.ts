/**
 * figma-cli — Read-only CLI for Figma REST API v1
 * Used by Bugzy agents for design research
 * Zero runtime dependencies, JSON-only output
 */

import { getFile, getFileMeta, getNodes } from './commands/file';
import { listComponents, getComponent, listComponentSets } from './commands/component';
import { exportImages } from './commands/image';
import { listStyles, getStyle } from './commands/style';
import { listProjects } from './commands/team';
import { listFiles } from './commands/project';

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

const HELP = `figma-cli — Read-only Figma design CLI

Usage:
  figma-cli <resource> <action> [options]

Resources & Actions:

  team projects  [team-id]              (defaults to FIGMA_TEAM_ID env var)
  project files  <project-id>

  file get       <file-key> [--depth N]
  file meta      <file-key>
  file nodes     <file-key> --ids <node-ids>  [--depth N]

  component list --file <file-key>
  component get  <component-key>
  component sets --file <file-key>

  image export   <file-key> --ids <node-ids> [--scale N] [--format png|jpg|svg|pdf]

  style list     --file <file-key>
  style get      <style-key>

Environment Variables:
  FIGMA_ACCESS_TOKEN   OAuth token (required)
  FIGMA_TEAM_ID        Default team ID for discovery (optional)

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
      case 'team':
        if (action === 'projects') {
          await listProjects(positional[2] || '');
        } else {
          console.error(JSON.stringify({ error: `Unknown action: team ${action || '(none)'}. Use --help for usage.` }));
          process.exit(1);
        }
        break;

      case 'project':
        if (action === 'files') {
          await listFiles(positional[2] || '');
        } else {
          console.error(JSON.stringify({ error: `Unknown action: project ${action || '(none)'}. Use --help for usage.` }));
          process.exit(1);
        }
        break;

      case 'file':
        switch (action) {
          case 'get':
            await getFile(positional[2], getOpt(options, 'depth'));
            break;
          case 'meta':
            await getFileMeta(positional[2]);
            break;
          case 'nodes':
            await getNodes(positional[2], getOpt(options, 'ids') || '', getOpt(options, 'depth'));
            break;
          default:
            console.error(JSON.stringify({ error: `Unknown action: file ${action || '(none)'}. Use --help for usage.` }));
            process.exit(1);
        }
        break;

      case 'component':
        switch (action) {
          case 'list':
            await listComponents(getOpt(options, 'file') || '');
            break;
          case 'get':
            await getComponent(positional[2]);
            break;
          case 'sets':
            await listComponentSets(getOpt(options, 'file') || '');
            break;
          default:
            console.error(JSON.stringify({ error: `Unknown action: component ${action || '(none)'}. Use --help for usage.` }));
            process.exit(1);
        }
        break;

      case 'image':
        if (action === 'export') {
          await exportImages(
            positional[2],
            getOpt(options, 'ids') || '',
            getOpt(options, 'scale'),
            getOpt(options, 'format')
          );
        } else {
          console.error(JSON.stringify({ error: `Unknown action: image ${action || '(none)'}. Use --help for usage.` }));
          process.exit(1);
        }
        break;

      case 'style':
        switch (action) {
          case 'list':
            await listStyles(getOpt(options, 'file') || '');
            break;
          case 'get':
            await getStyle(positional[2]);
            break;
          default:
            console.error(JSON.stringify({ error: `Unknown action: style ${action || '(none)'}. Use --help for usage.` }));
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
