import { Command } from "commander";
import type { ToolHandlers } from "../tool-handlers";
import { formatProjectList } from "../formatters";

export function createProjectCommand(handlers: ToolHandlers): Command {
  const project = new Command("project").description("Manage Asana projects");

  project
    .command("list")
    .description("List projects in the workspace")
    .option("-l, --limit <n>", "Maximum results (default: 100)", "100")
    .option("-w, --workspace <gid>", "Workspace GID override")
    .option("--json", "Output raw JSON")
    .action(async (opts) => {
      const result = await handlers.listProjects({
        limit: parseInt(opts.limit, 10),
        workspace_gid: opts.workspace,
      });

      if (!result.success) {
        console.error(result.error);
        process.exit(1);
      }

      if (opts.json) {
        console.log(JSON.stringify(result.data, null, 2));
      } else {
        console.log(formatProjectList(result.data!.data));
      }
    });

  return project;
}
