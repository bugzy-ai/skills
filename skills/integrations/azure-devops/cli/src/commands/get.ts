import { getWorkItem } from '../api-client';

export interface GetOptions {
  project: string;
  fields?: string;
  expand?: string;
}

export async function getCommand(id: string, options: GetOptions): Promise<void> {
  if (!id) {
    throw new Error('Work item ID is required');
  }
  if (!options.project) {
    throw new Error('--project is required for work-item get');
  }

  const numId = parseInt(id, 10);
  if (isNaN(numId)) {
    throw new Error(`Invalid work item ID: ${id}`);
  }

  const workItem = await getWorkItem(numId, options.project, {
    fields: options.fields,
    expand: options.expand,
  });
  console.log(JSON.stringify(workItem, null, 2));
}
