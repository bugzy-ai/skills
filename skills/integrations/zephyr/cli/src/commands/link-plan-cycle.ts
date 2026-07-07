import { request } from '../client';
import type { ZephyrCreatedResource, ZephyrTestCycle, ZephyrTestPlan } from '../types';

interface LinkPlanCycleArgs {
  plan: string;
  cycle: string;
}

function isLinked(plan: ZephyrTestPlan, cycle: ZephyrTestCycle): boolean {
  return Boolean(plan.links?.testCycles?.some((link) => (
    link.testCycleId === cycle.id ||
    link.target?.endsWith(`/testcycles/${cycle.id}`) ||
    link.target?.endsWith(`/testcycles/${cycle.key}`)
  )));
}

export async function linkPlanCycle(args: LinkPlanCycleArgs): Promise<void> {
  if (!args.plan) throw new Error('--plan is required');
  if (!args.cycle) throw new Error('--cycle is required');

  const [plan, cycle] = await Promise.all([
    request<ZephyrTestPlan>('GET', `/testplans/${encodeURIComponent(args.plan)}`),
    request<ZephyrTestCycle>('GET', `/testcycles/${encodeURIComponent(args.cycle)}`),
  ]);

  if (isLinked(plan, cycle)) {
    process.stdout.write(JSON.stringify({ created: false, link: { testPlan: args.plan, testCycle: args.cycle } }, null, 2));
    return;
  }

  const link = await request<ZephyrCreatedResource>(
    'POST',
    `/testplans/${encodeURIComponent(args.plan)}/links/testcycles`,
    { testCycleIdOrKey: args.cycle }
  );
  process.stdout.write(JSON.stringify({ created: true, link }, null, 2));
}
