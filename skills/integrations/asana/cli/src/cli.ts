import "dotenv/config";
import { Command } from "commander";
import { AsanaClient } from "./asana-client";
import { ToolHandlers } from "./tool-handlers";
import { createTaskCommand } from "./commands/task";
import { createProjectCommand } from "./commands/project";
import { createSectionCommand } from "./commands/section";

/**
 * Lazy-initialized handlers — created on first command invocation,
 * allowing --help/--version to work without env vars.
 */
let _handlers: ToolHandlers | undefined;
function getHandlers(): ToolHandlers {
  if (!_handlers) {
    const client = new AsanaClient();
    _handlers = new ToolHandlers(client);
  }
  return _handlers;
}

const lazyHandlers = new Proxy({} as ToolHandlers, {
  get(_target, prop: string) {
    const handlers = getHandlers();
    const value = handlers[prop as keyof ToolHandlers];
    if (typeof value === 'function') {
      return value.bind(handlers);
    }
    return value;
  },
});

async function main(): Promise<void> {
  const program = new Command()
    .name("asana-cli")
    .description("Asana CLI for task and project management")
    .version("0.1.0");

  program.addCommand(createTaskCommand(lazyHandlers));
  program.addCommand(createProjectCommand(lazyHandlers));
  program.addCommand(createSectionCommand(lazyHandlers));

  await program.parseAsync(process.argv);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
