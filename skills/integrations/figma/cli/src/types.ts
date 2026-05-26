/**
 * Figma REST API v1 response types
 * Read-only types for file, component, style, and image endpoints
 */

/** Figma file metadata (from GET /v1/files/:key) */
export interface FigmaFile {
  name: string;
  lastModified: string;
  thumbnailUrl: string;
  version: string;
  role: string;
  editorType: string;
  document: FigmaNode;
}

/** Figma document node (recursive tree structure) */
export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  // Design-specific fields (present on certain node types)
  absoluteBoundingBox?: { x: number; y: number; width: number; height: number };
  fills?: unknown[];
  strokes?: unknown[];
  effects?: unknown[];
  characters?: string;
  style?: Record<string, unknown>;
  componentId?: string;
}

/** Component metadata (from GET /v1/files/:key/components or GET /v1/components/:key) */
export interface FigmaComponent {
  key: string;
  file_key: string;
  node_id: string;
  thumbnail_url: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  containing_frame?: { name: string; nodeId: string; pageName: string };
  user?: { handle: string; img_url: string };
}

/** Component set / variant group (from GET /v1/files/:key/component_sets) */
export interface FigmaComponentSet {
  key: string;
  file_key: string;
  name: string;
  description: string;
  node_id: string;
}

/** Style metadata (from GET /v1/files/:key/styles or GET /v1/styles/:key) */
export interface FigmaStyle {
  key: string;
  file_key: string;
  node_id: string;
  style_type: 'FILL' | 'TEXT' | 'EFFECT' | 'GRID';
  thumbnail_url: string;
  name: string;
  description: string;
}

/** File components/styles response wrapper */
export interface FigmaFileMetaResponse<T> {
  meta: {
    [key: string]: T[];
  };
}

/** Image export response (from GET /v1/images/:key) */
export interface FigmaImageResponse {
  err: string | null;
  images: Record<string, string | null>;
}

/** File nodes response (from GET /v1/files/:key/nodes) */
export interface FigmaNodesResponse {
  name: string;
  lastModified: string;
  nodes: Record<string, { document: FigmaNode; components: Record<string, FigmaComponent> }>;
}

/** Project metadata (from GET /v1/teams/:team_id/projects) */
export interface FigmaProject {
  id: string;
  name: string;
}

/** Project file metadata (from GET /v1/projects/:project_id/files) */
export interface FigmaProjectFile {
  key: string;
  name: string;
  thumbnail_url: string;
  last_modified: string;
}
