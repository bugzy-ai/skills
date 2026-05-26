import { request } from '../client';
import type { TestinyTestCase, TestinyFindResponse } from '../types';

// Testiny's DataReadParams schema accepts only { filter }. Pagination via
// body fields (limit/offset/take/page) is rejected; the server returns up to
// its default cap (currently 2000) and exposes the cap + count in `meta`.
// We honor the user's --limit by slicing client-side after the round-trip.
// Verified against the live API during BUG-71 Phase 0 probe.
interface ListCasesArgs {
  project?: string;
  limit?: string;
}

export async function listCases(args: ListCasesArgs): Promise<void> {
  const projectIdStr = args.project ?? process.env.TESTINY_PROJECT_ID;
  if (!projectIdStr) {
    throw new Error('--project or TESTINY_PROJECT_ID env is required');
  }
  const projectId = parseInt(projectIdStr, 10);
  if (isNaN(projectId)) {
    throw new Error(`--project must be a numeric id, got: "${projectIdStr}"`);
  }

  const limit = args.limit ? parseInt(args.limit, 10) : 50;
  if (isNaN(limit) || limit <= 0) {
    throw new Error(`--limit must be a positive number, got: "${args.limit}"`);
  }

  const result = await request<TestinyFindResponse<TestinyTestCase>>(
    'POST',
    '/testcase/find',
    { filter: { project_id: projectId } },
  );

  const all = result.data ?? result.items ?? [];
  const values = all.slice(0, limit);
  const total = result.meta?.count ?? result.total ?? all.length;
  process.stdout.write(JSON.stringify({ values, total }, null, 2));
}
