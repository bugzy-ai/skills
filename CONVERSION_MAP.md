# Bugzy Skills Conversion Map

This map is the canonical BUG-89 mapping from the private `packages/bugzy` task and subagent definitions to the public installable skills in this repository.

## Source inputs

- `packages/bugzy/src/tasks/constants.ts`
- `packages/bugzy/src/tasks/library/**`
- `packages/bugzy/src/tasks/steps/**`
- `packages/bugzy/src/subagents/metadata.ts`
- `packages/bugzy/src/subagents/templates/**`

## Task mappings

| Source slug | Skill paths |
|---|---|
| explore-application | `skills/qa/explore-application/` |
| explore-test-codebase | `skills/qa/explore-test-codebase/` |
| generate-test-plan | `skills/qa/generate-test-plan/` |
| generate-test-cases | `skills/qa/generate-test-cases/`<br>`skills/test-case-manager/filesystem/`<br>`skills/test-case-manager/zephyr/`<br>`skills/test-case-manager/testiny/` |
| run-tests | `skills/qa/run-tests/`<br>`skills/qa/triage-results/`<br>`skills/issue-tracker/linear/`<br>`skills/issue-tracker/jira/`<br>`skills/issue-tracker/jira-server/`<br>`skills/issue-tracker/azure-devops/`<br>`skills/issue-tracker/asana/`<br>`skills/issue-tracker/notion/`<br>`skills/issue-tracker/slack/`<br>`skills/issue-tracker/gitlab/`<br>`skills/issue-tracker/clickup/` |
| verify-changes | `skills/qa/verify-changes/` |
| verify-changes-on-ticket | `skills/qa/verify-changes-on-ticket/` |
| verify-changes-on-deployment | `skills/qa/verify-changes-on-deployment/` |
| onboard-testing | `skills/onboarding/onboard-testing/` |
| handle-message | `skills/communication/handle-team-message/` |
| process-event | `skills/events/process-system-event/` |
| triage-results | `skills/qa/triage-results/` |
| full-test-coverage (alias of onboard-testing) | `skills/onboarding/onboard-testing/` |

## Subagent/provider mappings

| Role | Integration | Skill path | Source template |
|---|---|---|---|
| browser-automation | playwright | `skills/browser-automation/playwright/` | `packages/bugzy/src/subagents/templates/browser-automation/playwright.ts` |
| test-engineer | default | `skills/test-engineer/default/` | `packages/bugzy/src/subagents/templates/test-engineer/default.ts` |
| test-case-manager | filesystem | `skills/test-case-manager/filesystem/` | `packages/bugzy/src/subagents/templates/test-case-manager/filesystem.ts` |
| test-case-manager | zephyr | `skills/test-case-manager/zephyr/` | `packages/bugzy/src/subagents/templates/test-case-manager/zephyr.ts` |
| test-case-manager | testiny | `skills/test-case-manager/testiny/` | `packages/bugzy/src/subagents/templates/test-case-manager/testiny.ts` |
| team-communicator | slack | `skills/team-communicator/slack/` | `packages/bugzy/src/subagents/templates/team-communicator/slack.ts` |
| team-communicator | teams | `skills/team-communicator/teams/` | `packages/bugzy/src/subagents/templates/team-communicator/teams.ts` |
| team-communicator | email | `skills/team-communicator/email/` | `packages/bugzy/src/subagents/templates/team-communicator/email.ts` |
| team-communicator | local | `skills/team-communicator/local/` | `packages/bugzy/src/subagents/templates/team-communicator/local.ts` |
| issue-tracker | linear | `skills/issue-tracker/linear/` | `packages/bugzy/src/subagents/templates/issue-tracker/linear.ts` |
| issue-tracker | jira | `skills/issue-tracker/jira/` | `packages/bugzy/src/subagents/templates/issue-tracker/jira.ts` |
| issue-tracker | jira-server | `skills/issue-tracker/jira-server/` | `packages/bugzy/src/subagents/templates/issue-tracker/jira-server.ts` |
| issue-tracker | azure-devops | `skills/issue-tracker/azure-devops/` | `packages/bugzy/src/subagents/templates/issue-tracker/azure-devops.ts` |
| issue-tracker | asana | `skills/issue-tracker/asana/` | `packages/bugzy/src/subagents/templates/issue-tracker/asana.ts` |
| issue-tracker | notion | `skills/issue-tracker/notion/` | `packages/bugzy/src/subagents/templates/issue-tracker/notion.ts` |
| issue-tracker | slack | `skills/issue-tracker/slack/` | `packages/bugzy/src/subagents/templates/issue-tracker/slack.ts` |
| issue-tracker | gitlab | `skills/issue-tracker/gitlab/` | `packages/bugzy/src/subagents/templates/issue-tracker/gitlab.ts` |
| issue-tracker | clickup | `skills/issue-tracker/clickup/` | `packages/bugzy/src/subagents/templates/issue-tracker/clickup.ts` |
| documentation-researcher | notion | `skills/documentation-researcher/notion/` | `packages/bugzy/src/subagents/templates/documentation-researcher/notion.ts` |
| documentation-researcher | jira | `skills/documentation-researcher/jira/` | `packages/bugzy/src/subagents/templates/documentation-researcher/jira.ts` |
| documentation-researcher | confluence | `skills/documentation-researcher/confluence/` | `packages/bugzy/src/subagents/templates/documentation-researcher/confluence.ts` |
| documentation-researcher | asana | `skills/documentation-researcher/asana/` | `packages/bugzy/src/subagents/templates/documentation-researcher/asana.ts` |
| documentation-researcher | linear | `skills/documentation-researcher/linear/` | `packages/bugzy/src/subagents/templates/documentation-researcher/linear.ts` |
| documentation-researcher | figma | `skills/documentation-researcher/figma/` | `packages/bugzy/src/subagents/templates/documentation-researcher/figma.ts` |
| documentation-researcher | azure-devops | `skills/documentation-researcher/azure-devops/` | `packages/bugzy/src/subagents/templates/documentation-researcher/azure-devops.ts` |
| source-control | github | `skills/source-control/github/` | `packages/bugzy/src/subagents/templates/source-control/github.ts` |
| source-control | gitlab | `skills/source-control/gitlab/` | `packages/bugzy/src/subagents/templates/source-control/gitlab.ts` |

## Explicit deferrals

- Configured-provider selection and visibility are left to BUG-90.
- Runtime installation and update at unified-agent startup are left to BUG-91.
- Removing the legacy task/subagent generator from `packages/bugzy/src` is out of scope for BUG-89.
