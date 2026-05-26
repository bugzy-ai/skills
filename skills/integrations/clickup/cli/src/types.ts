/**
 * ClickUp API response types
 * Typed representations of ClickUp REST API v2 responses
 */

export interface ClickUpUser {
  id: number;
  username: string;
  email: string;
  profilePicture?: string;
}

export interface ClickUpMember {
  user: ClickUpUser;
}

export interface ClickUpStatus {
  status: string;
  type: string;
  orderindex: number;
  color: string;
}

export interface ClickUpPriority {
  id: string;
  priority: string;
  color: string;
  orderindex: string;
}

export interface ClickUpList {
  id: string;
  name: string;
  space: { id: string; name: string };
  folder?: { id: string; name: string };
  statuses?: ClickUpStatus[];
}

export interface ClickUpFolder {
  id: string;
  name: string;
  lists: ClickUpList[];
}

export interface ClickUpSpace {
  id: string;
  name: string;
  statuses: ClickUpStatus[];
}

export interface ClickUpTask {
  id: string;
  custom_id?: string;
  name: string;
  description?: string;
  status: { status: string; type: string; color: string };
  priority?: ClickUpPriority | null;
  assignees: ClickUpUser[];
  list: { id: string; name: string };
  folder?: { id: string; name: string };
  space: { id: string };
  url: string;
  date_created: string;
  date_updated: string;
}

export interface ClickUpComment {
  id: string;
  comment_text: string;
  user: ClickUpUser;
  date: string;
}

export interface ClickUpTeam {
  id: string;
  name: string;
  members: ClickUpMember[];
}

/**
 * Paginated task response from ClickUp API
 */
export interface ClickUpTaskResponse {
  tasks: ClickUpTask[];
  last_page: boolean;
}
