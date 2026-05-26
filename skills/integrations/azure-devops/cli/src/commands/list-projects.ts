import { listProjects } from '../api-client';

export interface ListProjectsOptions {
  top?: string;
  skip?: string;
}

export async function listProjectsCommand(options: ListProjectsOptions): Promise<void> {
  const projects = await listProjects({
    top: options.top ? parseInt(options.top, 10) : undefined,
    skip: options.skip ? parseInt(options.skip, 10) : undefined,
  });
  console.log(JSON.stringify({ projects }, null, 2));
}
