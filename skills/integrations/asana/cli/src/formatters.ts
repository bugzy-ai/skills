import type { AsanaTask, AsanaProject, AsanaSection, AsanaStory } from "./types";

/**
 * Format a task list for compact agent-readable output
 */
export function formatTaskList(tasks: AsanaTask[]): string {
  if (tasks.length === 0) {
    return "No tasks found.";
  }

  const lines = tasks.map((task) => {
    const status = task.completed ? "[x]" : "[ ]";
    const assignee = task.assignee?.name || "Unassigned";
    const due = task.due_on || "No due date";
    const project =
      task.projects && task.projects.length > 0
        ? task.projects[0].name
        : "No project";
    return `${status} ${task.gid} | ${task.name} | ${assignee} | ${due} | ${project}`;
  });

  return `Found ${tasks.length} task(s):\n${lines.join("\n")}`;
}

/**
 * Format a single task detail for compact agent-readable output
 */
export function formatTaskDetail(task: AsanaTask): string {
  const lines: string[] = [];
  const status = task.completed ? "Completed" : "Open";

  lines.push(`Task: ${task.name}`);
  lines.push(`GID: ${task.gid}`);
  lines.push(`Status: ${status}`);
  lines.push(`Assignee: ${task.assignee?.name || "Unassigned"}`);
  lines.push(`Due: ${task.due_on || "No due date"}`);

  if (task.projects && task.projects.length > 0) {
    lines.push(
      `Projects: ${task.projects.map((p) => `${p.name} (${p.gid})`).join(", ")}`
    );
  }

  if (task.memberships && task.memberships.length > 0) {
    const sections = task.memberships
      .filter((m) => m.section)
      .map((m) => `${m.project.name} > ${m.section!.name}`);
    if (sections.length > 0) {
      lines.push(`Sections: ${sections.join(", ")}`);
    }
  }

  if (task.tags && task.tags.length > 0) {
    lines.push(`Tags: ${task.tags.map((t) => t.name).join(", ")}`);
  }

  if (task.parent) {
    lines.push(`Parent: ${task.parent.name} (${task.parent.gid})`);
  }

  if (task.num_subtasks && task.num_subtasks > 0) {
    lines.push(`Subtasks: ${task.num_subtasks}`);
  }

  if (task.permalink_url) {
    lines.push(`URL: ${task.permalink_url}`);
  }

  if (task.created_at) {
    lines.push(`Created: ${task.created_at}`);
  }

  if (task.modified_at) {
    lines.push(`Modified: ${task.modified_at}`);
  }

  if (task.notes) {
    const truncatedNotes =
      task.notes.length > 500
        ? task.notes.substring(0, 500) + "..."
        : task.notes;
    lines.push(`\nDescription:\n${truncatedNotes}`);
  }

  if (task.custom_fields && task.custom_fields.length > 0) {
    const fields = task.custom_fields
      .filter((f) => f.display_value)
      .map((f) => `  ${f.name}: ${f.display_value}`);
    if (fields.length > 0) {
      lines.push(`\nCustom Fields:\n${fields.join("\n")}`);
    }
  }

  return lines.join("\n");
}

/**
 * Format a project list for compact agent-readable output
 */
export function formatProjectList(projects: AsanaProject[]): string {
  if (projects.length === 0) {
    return "No projects found.";
  }

  const lines = projects.map((project) => {
    const owner = project.owner?.name || "No owner";
    return `${project.gid} | ${project.name} | ${owner}`;
  });

  return `Found ${projects.length} project(s):\n${lines.join("\n")}`;
}

/**
 * Format a comment/story creation result
 */
export function formatComment(story: AsanaStory): string {
  return `Comment added (GID: ${story.gid}) at ${story.created_at}`;
}

/**
 * Format a section list for compact agent-readable output
 */
export function formatSectionList(sections: AsanaSection[]): string {
  if (sections.length === 0) {
    return "No sections found.";
  }

  const lines = sections.map((section) => {
    return `${section.gid} | ${section.name}`;
  });

  return `Found ${sections.length} section(s):\n${lines.join("\n")}`;
}

/**
 * Format task creation/update result
 */
export function formatTaskResult(task: AsanaTask, action: string): string {
  return `Task ${action}: ${task.name} (GID: ${task.gid})${task.permalink_url ? `\nURL: ${task.permalink_url}` : ""}`;
}
