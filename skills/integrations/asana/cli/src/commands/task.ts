import { Command } from "commander";
import type { ToolHandlers } from "../tool-handlers";
import {
  formatTaskList,
  formatTaskDetail,
  formatComment,
  formatTaskResult,
  formatSectionList,
} from "../formatters";

export function createTaskCommand(handlers: ToolHandlers): Command {
  const task = new Command("task").description("Manage Asana tasks");

  task
    .command("list")
    .description("List tasks in a project (works on all Asana tiers)")
    .requiredOption("-p, --project-gid <gid>", "Project GID")
    .option(
      "--completed-since <date>",
      'Only tasks completed after this date (ISO 8601) or "now" for incomplete only'
    )
    .option("--json", "Output raw JSON")
    .action(async (opts) => {
      const result = await handlers.listProjectTasks({
        project_gid: opts.projectGid,
        completed_since: opts.completedSince,
      });

      if (!result.success) {
        console.error(result.error);
        process.exit(1);
      }

      if (opts.json) {
        console.log(JSON.stringify(result.data, null, 2));
      } else {
        console.log(formatTaskList(result.data!.data));
      }
    });

  task
    .command("search")
    .description("Search for tasks in the workspace")
    .requiredOption("-q, --query <text>", "Text to search for")
    .option("-p, --project <gid>", "Filter by project GID")
    .option("-a, --assignee <gid>", "Filter by assignee GID")
    .option("--completed", "Include completed tasks")
    .option("-l, --limit <n>", "Maximum results (default: 25)", "25")
    .option("-w, --workspace <gid>", "Workspace GID override")
    .option("--json", "Output raw JSON")
    .action(async (opts) => {
      const result = await handlers.searchTasks({
        query: opts.query,
        project_gid: opts.project,
        assignee: opts.assignee,
        completed: opts.completed ? true : undefined,
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
        console.log(formatTaskList(result.data!.data));
      }
    });

  task
    .command("get")
    .description("Get detailed information about a task")
    .argument("<gid>", "Task GID")
    .option("--json", "Output raw JSON")
    .action(async (gid: string, opts) => {
      const result = await handlers.getTask({ task_gid: gid });

      if (!result.success) {
        console.error(result.error);
        process.exit(1);
      }

      if (opts.json) {
        console.log(JSON.stringify(result.data, null, 2));
      } else {
        console.log(formatTaskDetail(result.data!.data));
      }
    });

  task
    .command("create")
    .description("Create a new task")
    .requiredOption("-n, --name <name>", "Task name")
    .requiredOption("-p, --project <gid>", "Project GID")
    .option("-d, --description <text>", "Task description")
    .option("-a, --assignee <gid>", "Assignee GID")
    .option("--due <date>", "Due date (YYYY-MM-DD)")
    .option("-w, --workspace <gid>", "Workspace GID override")
    .option("--json", "Output raw JSON")
    .action(async (opts) => {
      const result = await handlers.createTask({
        name: opts.name,
        project_gid: opts.project,
        description: opts.description,
        assignee_gid: opts.assignee,
        due_date: opts.due,
        workspace_gid: opts.workspace,
      });

      if (!result.success) {
        console.error(result.error);
        process.exit(1);
      }

      if (opts.json) {
        console.log(JSON.stringify(result.data, null, 2));
      } else {
        console.log(formatTaskResult(result.data!.data, "created"));
      }
    });

  task
    .command("update")
    .description("Update an existing task")
    .argument("<gid>", "Task GID")
    .option("-n, --name <name>", "New task name")
    .option("--completed", "Mark as completed")
    .option("--incomplete", "Mark as incomplete")
    .option("-a, --assignee <gid>", "Assignee GID (use 'null' to unassign)")
    .option("--due <date>", "Due date YYYY-MM-DD (use 'null' to clear)")
    .option("-d, --description <text>", "New description")
    .option("--json", "Output raw JSON")
    .action(async (gid: string, opts) => {
      const updates: Record<string, unknown> = { task_gid: gid };

      if (opts.name) updates.name = opts.name;
      if (opts.completed) updates.completed = true;
      if (opts.incomplete) updates.completed = false;
      if (opts.assignee) updates.assignee_gid = opts.assignee;
      if (opts.due) updates.due_date = opts.due;
      if (opts.description) updates.description = opts.description;

      const result = await handlers.updateTask(updates);

      if (!result.success) {
        console.error(result.error);
        process.exit(1);
      }

      if (opts.json) {
        console.log(JSON.stringify(result.data, null, 2));
      } else {
        console.log(formatTaskResult(result.data!.data, "updated"));
      }
    });

  task
    .command("comment")
    .description("Add a comment to a task")
    .argument("<gid>", "Task GID")
    .requiredOption("-b, --body <text>", "Comment text")
    .option("--json", "Output raw JSON")
    .action(async (gid: string, opts) => {
      const result = await handlers.addComment({
        task_gid: gid,
        text: opts.body,
      });

      if (!result.success) {
        console.error(result.error);
        process.exit(1);
      }

      if (opts.json) {
        console.log(JSON.stringify(result.data, null, 2));
      } else {
        console.log(formatComment(result.data!.data));
      }
    });

  return task;
}
