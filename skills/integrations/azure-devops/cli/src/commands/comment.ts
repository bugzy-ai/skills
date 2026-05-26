import { addComment } from '../api-client';

export interface CommentOptions {
  project: string;
  body: string;
}

export async function commentCommand(id: string, options: CommentOptions): Promise<void> {
  if (!id) {
    throw new Error('Work item ID is required');
  }
  if (!options.project) {
    throw new Error('--project is required for work-item comment');
  }
  if (!options.body) {
    throw new Error('--body is required for work-item comment');
  }

  const numId = parseInt(id, 10);
  if (isNaN(numId)) {
    throw new Error(`Invalid work item ID: ${id}`);
  }

  const comment = await addComment(numId, options.body, options.project);
  console.log(JSON.stringify(comment, null, 2));
}
