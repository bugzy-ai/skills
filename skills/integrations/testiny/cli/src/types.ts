export type TestinyTemplate = 'STEPS' | 'TEXT';

export interface TestinyTestCase {
  id: number;
  _etag: string;
  project_id: number;
  title: string;
  template: TestinyTemplate;
  description?: string | null;
  steps_text?: string | null;
  content_text?: string | null;
  precondition_text?: string | null;
  expected_result_text?: string | null;
  priority?: string | null;
  testcase_type?: string | null;
  owner_user_id?: number | null;
  sort_index?: number;
  is_deleted?: boolean;
  created_at?: string;
  modified_at?: string;
}

export interface TestinyFindResponse<T> {
  data?: T[];
  items?: T[];
  total?: number;
  meta?: {
    offset?: number;
    limit?: number;
    count?: number;
  };
}

export interface TestinyTestPlan {
  id: number;
  project_id: number;
  title: string;
  description?: string | null;
  is_deleted?: boolean;
  created_at?: string;
  created_by?: number;
  modified_at?: string;
  modified_by?: number;
  deleted_at?: string | null;
  deleted_by?: number | null;
}
