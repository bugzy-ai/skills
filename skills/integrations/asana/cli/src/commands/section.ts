import { Command } from "commander";
import type { ToolHandlers } from "../tool-handlers";
import { formatSectionList } from "../formatters";

export function createSectionCommand(handlers: ToolHandlers): Command {
  const section = new Command("section").description(
    "Manage Asana project sections"
  );

  section
    .command("list")
    .description("List sections in a project")
    .requiredOption("-p, --project-gid <gid>", "Project GID")
    .option("--json", "Output raw JSON")
    .action(async (opts) => {
      const result = await handlers.listProjectSections({
        project_gid: opts.projectGid,
      });

      if (!result.success) {
        console.error(result.error);
        process.exit(1);
      }

      if (opts.json) {
        console.log(JSON.stringify(result.data, null, 2));
      } else {
        console.log(formatSectionList(result.data!.data));
      }
    });

  return section;
}
