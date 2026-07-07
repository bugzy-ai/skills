import { request } from '../jira-client';
import { getProject } from './project';

interface VersionArgs {
  project: string;
  name?: string;
  description?: string;
}

interface JiraVersion {
  id: string;
  name: string;
  projectId?: number;
  archived?: boolean;
  released?: boolean;
}

export async function listVersions(args: VersionArgs): Promise<void> {
  if (!args.project) throw new Error('--project is required');

  const versions = await request<JiraVersion[]>(
    'GET',
    `/project/${encodeURIComponent(args.project)}/versions`
  );
  process.stdout.write(JSON.stringify(versions, null, 2));
}

export async function ensureVersion(args: VersionArgs): Promise<void> {
  if (!args.project) throw new Error('--project is required');
  if (!args.name) throw new Error('--name is required');

  const versions = await request<JiraVersion[]>(
    'GET',
    `/project/${encodeURIComponent(args.project)}/versions`
  );
  const matchingVersions = versions.filter((version) => version.name === args.name);
  const existing = matchingVersions.find((version) => !version.archived && !version.released);
  if (existing) {
    process.stdout.write(JSON.stringify({ created: false, version: existing }, null, 2));
    return;
  }
  if (matchingVersions.length > 0) {
    throw new Error(
      `Jira version "${args.name}" exists but is archived or released. ` +
        'Choose an unreleased, unarchived version or update the existing version before retrying.'
    );
  }

  const project = await getProject(args.project);
  const version = await request<JiraVersion>('POST', '/version', {
    name: args.name,
    projectId: Number(project.id),
    released: false,
    archived: false,
    ...(args.description ? { description: args.description } : {}),
  });

  process.stdout.write(JSON.stringify({ created: true, version }, null, 2));
}
