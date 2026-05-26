export interface AzureDevOpsConfig {
  orgUrl: string;
  pat: string;
  apiVersion?: string;
  timeout?: number;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  url: string;
  state: string;
  visibility: string;
}

export interface ProjectsResponse {
  count: number;
  value: Project[];
}

export interface IdentityRef {
  displayName: string;
  url: string;
  id: string;
  uniqueName: string;
}

export interface WorkItemFields {
  'System.Id': number;
  'System.Title': string;
  'System.State': string;
  'System.WorkItemType': string;
  'System.AssignedTo'?: IdentityRef;
  'System.Description'?: string;
  'System.AreaPath': string;
  'System.IterationPath': string;
  'Microsoft.VSTS.Common.Priority'?: number;
  'Microsoft.VSTS.Common.Severity'?: string;
  'System.Tags'?: string;
  [key: string]: unknown;
}

export interface WorkItemRelation {
  rel: string;
  url: string;
  attributes: Record<string, unknown>;
}

export interface WorkItem {
  id: number;
  rev: number;
  url: string;
  fields: WorkItemFields;
  relations?: WorkItemRelation[];
  _links?: Record<string, { href: string }>;
}

export interface WorkItemReference {
  id: number;
  url: string;
}

export interface WiqlQueryResult {
  queryType: string;
  queryResultType: string;
  asOf: string;
  columns?: Array<{ referenceName: string; name: string; url: string }>;
  sortColumns?: Array<{ field: { referenceName: string }; descending: boolean }>;
  workItems: WorkItemReference[];
}

export interface WorkItemComment {
  id: number;
  workItemId: number;
  version: number;
  text: string;
  createdBy: IdentityRef;
  createdDate: string;
}

export interface JsonPatchOperation {
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
  path: string;
  value?: unknown;
  from?: string;
}

export interface AzureDevOpsErrorResponse {
  message?: string;
  typeName?: string;
  typeKey?: string;
  errorCode?: number;
}
