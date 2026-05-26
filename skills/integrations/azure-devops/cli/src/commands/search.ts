import { searchWorkItems } from '../api-client';

export interface SearchOptions {
  project: string;
  query?: string;
  type?: string;
  state?: string;
  areaPath?: string;
  top?: string;
}

/**
 * Build a WIQL query from search options.
 * If query starts with SELECT, treat as raw WIQL passthrough.
 * Otherwise, auto-generate a WIQL query with optional filters.
 */
function buildWiql(options: SearchOptions): string {
  const query = options.query ?? '';

  // WIQL passthrough — detected by SELECT prefix
  if (query.trimStart().toUpperCase().startsWith('SELECT')) {
    return query;
  }

  const conditions: string[] = [];

  if (query) {
    conditions.push(`[System.Title] CONTAINS '${query.replace(/'/g, "''")}'`);
  }
  if (options.type) {
    conditions.push(`[System.WorkItemType] = '${options.type.replace(/'/g, "''")}'`);
  }
  if (options.state) {
    conditions.push(`[System.State] = '${options.state.replace(/'/g, "''")}'`);
  }
  if (options.areaPath) {
    conditions.push(`[System.AreaPath] UNDER '${options.areaPath.replace(/'/g, "''")}'`);
  }

  const where = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';

  return `SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType], [System.AssignedTo] FROM WorkItems${where} ORDER BY [System.CreatedDate] DESC`;
}

export async function searchCommand(options: SearchOptions): Promise<void> {
  if (!options.project) {
    throw new Error('--project is required for work-item search');
  }

  const wiql = buildWiql(options);
  const top = options.top ? parseInt(options.top, 10) : 50;

  const result = await searchWorkItems(wiql, options.project, { top });
  console.log(JSON.stringify(result, null, 2));
}
