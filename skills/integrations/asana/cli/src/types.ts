/**
 * TypeScript types for Asana REST API v1.0 responses
 */

export interface AsanaUser {
  gid: string;
  name: string;
  resource_type: "user";
  email?: string;
}

export interface AsanaWorkspace {
  gid: string;
  name: string;
  resource_type: "workspace";
}

export interface AsanaProject {
  gid: string;
  name: string;
  resource_type: "project";
  archived?: boolean;
  color?: string | null;
  created_at?: string;
  modified_at?: string;
  notes?: string;
  owner?: AsanaUser | null;
  workspace?: AsanaWorkspace;
  sections?: AsanaSection[];
}

export interface AsanaSection {
  gid: string;
  name: string;
  resource_type: "section";
}

export interface AsanaTask {
  gid: string;
  name: string;
  resource_type: "task";
  assignee?: AsanaUser | null;
  assignee_status?: string;
  completed?: boolean;
  completed_at?: string | null;
  created_at?: string;
  modified_at?: string;
  due_on?: string | null;
  due_at?: string | null;
  notes?: string;
  html_notes?: string;
  num_subtasks?: number;
  permalink_url?: string;
  projects?: AsanaProject[];
  tags?: Array<{ gid: string; name: string }>;
  memberships?: Array<{
    project: { gid: string; name: string };
    section?: { gid: string; name: string };
  }>;
  parent?: { gid: string; name: string } | null;
  custom_fields?: Array<{
    gid: string;
    name: string;
    display_value?: string | null;
    type?: string;
  }>;
}

export interface AsanaStory {
  gid: string;
  resource_type: "story";
  created_at: string;
  created_by?: AsanaUser;
  text: string;
  type: string;
}

export interface AsanaPagedResponse<T> {
  data: T[];
  next_page?: {
    offset: string;
    path: string;
    uri: string;
  } | null;
}

export interface AsanaSingleResponse<T> {
  data: T;
}

export interface AsanaErrorResponse {
  errors: Array<{
    message: string;
    help?: string;
    phrase?: string;
  }>;
}
