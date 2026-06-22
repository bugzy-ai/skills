---
name: verify-changes-on-ticket
description: Verify work represented by an issue-tracker ticket with ticket context, targeted tests, manual checks, and reporting. Use when a Jira, Linear, Asana, Azure DevOps, or similar ticket moves into QA or review.
---

# Verify Changes on Ticket

Follow this workflow in order. The skill body is self-contained: use the user's request, repository files, runtime artifacts, and configured capabilities/providers available in the current session.

## Capability and provider usage

When a step names a configured capability or provider, use the matching installed skill, CLI, MCP server, or inline tools available in the current session. If a required capability is unavailable, report it as a blocker before attempting unsupported work. If an optional provider is unavailable, continue from local artifacts and include the skipped provider action in the final report.

### Required capabilities

- browser automation: required for the full workflow.
- test engineer: required for the full workflow.
- test case manager: required for the full workflow.

### Optional providers

- documentation researcher: use when configured.
- issue tracker: use when configured.
- source control: use when configured.

## Workflow

### Step 1: Verify Changes on Ticket — Overview

# Verify Changes on Ticket

Verifies code changes triggered by an issue tracker status change (ticket moves to QA/Review/Test status).

**Trigger sources:** `com.jira.issue.updated`, `com.jira-server.issue.updated`, `com.asana.task.section_move`.

**Flow:** Extract ticket context → determine test scope → create tests for gaps → run tests → report results to issue tracker and team channel.

**Explore first, ask later:** The ticket description is an authoritative trigger — it asserts the feature exists. Always explore the app to discover the feature before asking clarification. Create test artifacts based on what you find, even if the description is vague. Only stop for CRITICAL contradictions (not for underspecified details).

### Step 2: Security Notice

## SECURITY NOTICE

**CRITICAL**: Never read the `.env` file. It contains ONLY secrets.

**SECRETS** (go in .env ONLY - never in .env.testdata):
- Variables containing: PASSWORD, SECRET, TOKEN, KEY, CREDENTIALS, API_KEY
- Examples: TEST_USER_PASSWORD, TEST_API_KEY, TEST_AUTH_TOKEN, TEST_SECRET

**TEST DATA** (go in .env.testdata - safe to commit):
- URLs: TEST_BASE_URL, TEST_API_URL
- Emails: TEST_USER_EMAIL, TEST_OWNER_EMAIL
- Non-sensitive inputs: TEST_CHECKOUT_FIRST_NAME, TEST_DEFAULT_TIMEOUT

**Rule**: If a variable name contains PASSWORD, SECRET, TOKEN, or KEY - it's a secret.
Reference secret variable names only (e.g., ${TEST_USER_PASSWORD}) - values injected at runtime.
The `.env` file access is blocked by settings.json.

### Step 3: Arguments

**Input**: the user's current request and any explicit skill arguments

The input contains a ticket event payload with issue key, status transition, project details, and related context from the issue tracker webhook.

### Step 4: Extract Ticket Context

Parse the ticket event payload to extract verification context:

**Jira Cloud / Jira Server:** Issue key from `issue.key`, title from `issue.fields.summary`, description from `issue.fields.description`, labels from `issue.fields.labels`, linked PRs from `issue.fields.development` or linked issues, assignee from `issue.fields.assignee.displayName`, status transition from `changelog.items` where `field === "status"`.

**Asana:** Task GID from event payload, title from task name, description from task notes, section the task moved to (QA/Review/Test).

Build CHANGE_CONTEXT with: trigger='TICKET', issueId, title, description, labels, assignee, statusTransition (from/to).

### Step 5: Look Up Related PRs (when source control is configured)

Run this step only when the source control provider/capability is configured. Otherwise skip remote/provider actions and include the relevant facts in the final output.

Use the configured source-control provider to find PRs linked to this ticket using the issue key/ID from CHANGE_CONTEXT. Gather PR titles, descriptions, comments, and status (open/merged/draft).

**IMPORTANT — Blackbox testing**: Do NOT look at code diffs, changed files, or source code. Test scope is determined from ticket and PR descriptions only, never from code.

Use PR descriptions to enrich CHANGE_CONTEXT for test scope determination.

### Step 6: Clarification Protocol

## Clarification Protocol

Before creating or running tests, ensure requirements are clear and unambiguous.

### Resume Flow

If `the user's current request and any explicit skill arguments.clarification` exists: extract the user's answer and `originalArgs` and proceed. Otherwise continue with ambiguity detection.

### Detect Ambiguity

Ask yourself: can I write test assertions without making assumptions? Is there exactly ONE valid interpretation?

Look for: missing pages/features, contradictory instructions, undefined success criteria, vague scope ("fix", "improve" without metrics), multiple valid interpretations.

Before asking, check the current request, available provider data, and existing artifacts for previously answered similar questions.

### Severity and Action

- **CRITICAL**: Feature/page confirmed absent (no authoritative trigger claims it exists), contradictory requirements, core behavior undefined → **BLOCKED** — continue with unaffected work, include blocked reasoning in output
- **HIGH**: Core underspecified, risky assumptions needed → **BLOCKED** — continue with unaffected work, include blocked reasoning in output (for new/growing projects)
- **MEDIUM/LOW**: Minor details missing, reasonable defaults exist → **PROCEED** with documented assumptions

**Project maturity adjusts the BLOCKED threshold:** New projects (few tests, small knowledge base) → block for CRITICAL+HIGH+MEDIUM. Growing → block for CRITICAL+HIGH. Mature (many tests, rich knowledge base) → block for CRITICAL only.

### Execution Obstacle vs. Requirement Ambiguity

When you cannot find a feature, ask: does an authoritative trigger source (Jira ticket, PR, team message) assert it exists?
- **YES** → Execution obstacle (access issue, feature flag, etc.). Proceed with test artifacts, notify team about the obstacle.
- **NO** → The feature may genuinely not exist. Classify as CRITICAL ambiguity.

A page loading does NOT mean the requested functionality exists on it. Evaluate whether the SPECIFIC REQUESTED FUNCTIONALITY is present, not just whether a URL resolves. If the page loads but the requested features are absent and no authoritative source claims they were built → CRITICAL.

### How to Communicate Blocked Items

When severity meets the BLOCKED threshold:
1. Continue with any parts of the task that ARE clear and unaffected
2. For the blocked aspect, include a structured section in your output:
   ```
   ## Blocked: [Brief Description]
   **What we found:** [what you discovered]
   **What's unclear:** [specific question]
   **Options:** [list concrete options if applicable]
   **Original args:** `<json>`
   ```
3. Skip test creation/execution ONLY for the unclear aspects — proceed with everything else

### Hard Rules

- Do NOT create tests, run tests, or generate artifacts for unclear/missing/contradictory requirements at CRITICAL/HIGH severity
- Do NOT silently adapt (e.g., substituting a different page for one that doesn't exist)
- Do NOT resolve contradictions by checking the app — the customer decides expected behavior, not the current implementation
- BLOCKED means skip the unclear aspect — continue with all other work and include the blocked section in your output
- Do NOT invent success criteria when none are provided

### Step 7: Determine Test Scope (Smart Selection)

**IMPORTANT — Blackbox testing**: You do NOT have access to code files and MUST NOT look at code diffs or changed files. Infer test scope entirely from the ticket description, PR title/description, and labels.

### Keyword-to-Suite Mapping

Extract feature keywords from the ticket/PR and map them to test suites:
- "login", "auth", "sign in/up" → Auth tests
- "checkout", "payment", "cart" → Checkout/Cart tests
- "API", "endpoint", "REST", "GraphQL" → API tests
- "profile", "account", "settings" → Profile tests

Use labels (e.g., "bugfix", "feature") to refine scope.

### Fallback Rules

- **Full suite**: refactors, dependency upgrades, breaking changes, DB migrations
- **Smoke tests only**: typo fixes, documentation-only changes, formatting/linting
- **Vague description with accessible app**: Explore the running application first to discover what exists, then select tests based on what you find. Do NOT ask clarification when you can resolve ambiguity by browsing.
- **Vague description with NO accessible app**: Include a structured blocked section in your output describing the ambiguity and asking which test suite to run with concrete options. Continue with any areas where scope IS clear.

### Overrides

If the user explicitly requests a scope ("only smoke tests", "full suite", specific suite names), honor it over smart selection.

### Step 8: Create Tests for Coverage Gaps (when test engineer is configured)

Run this step only when the test engineer provider/capability is configured. Otherwise skip remote/provider actions and include the relevant facts in the final output.

If existing tests already cover the changed feature, skip this step.

### Identify Coverage Gaps

Compare the feature under test (from ticket/PR description) against existing specs in the project automation suite. If gaps exist:

### Create Test Cases

Use the configured test case management provider to create test cases: one per scenario with objective, preconditions, steps, and expected results. Mark `automated: true` for automatable scenarios.

### Handle Missing Test Data

**Never skip test creation or declare "BLOCKED" because of missing test data.** Create tests normally using `process.env.VAR_NAME` references. Add placeholder entries to `.env.testdata` for missing variables. Note missing test data in your results output — the inbox agent will notify the team. Include: which variables are missing, what values they need, and which tests depend on them.

### Generate Automation Artifacts

Use the configured test automation engineering capability to create or update automation artifacts from the test cases above. The test automation engineering capability will explore the feature, create automation support abstractions and artifacts per `./tests/CLAUDE.md`, run them to verify, and link back to the test cases.

### Update Test Plan (Living Document)

After creating new test cases, update `test-plan.md` to reflect the new coverage: mark covered features with ✅ and TC-XXX IDs, update `updated_at` in metadata. Skip if `test-plan.md` does not exist.

### Step 9: Execute Automated Tests

## Execute Automated Tests

**Read `./tests/CLAUDE.md`** for the project's test execution commands.

Run tests using the commands from `./tests/CLAUDE.md`:
- File pattern or specific file: framework's file selection command
- Tag filter: framework's tag/grep command
- All tests: default run-all command

Wait for execution to complete.

**Server-Side Verification (SSH)**
If `SSH_TEST_HOST` is set in the environment, you can verify server-side state during or after test execution. The test automation engineering capability has SSH access via:

```bash
ssh -i $SSH_TEST_KEY_PATH -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null $SSH_TEST_USER@$SSH_TEST_HOST "<command>"
```

Use this to check application logs, query databases, verify service health, or confirm file uploads after browser actions. Only run read-only commands (cat, grep, tail, head, curl, psql queries, systemctl status, ls, df, free, uptime). If `SSH_TEST_PORT` is set, add `-p $SSH_TEST_PORT`. On connection failure, report as an environment issue and continue with browser-based testing.

**Locate results** after execution:
```bash
ls -t test-runs/ | head -1
```
Store the timestamp for subsequent steps.

### Step 10: Parse Test Results

## Parse Test Results from Manifest

Read the most recent `test-runs/[timestamp]/manifest.json`.

**Extract from manifest:**
- `stats`: totalTests, passed, failed, totalExecutions
- Duration: calculate from `startTime` and `endTime`
- For each failed test in `testCases` array: id, name, finalStatus, and from latest execution: error, duration, video/trace/screenshot availability

**Key fields in testCases[]:**
- `id`, `name`, `finalStatus`
- `executions[last].error`, `executions[last].duration`
- Artifacts at `test-runs/{timestamp}/{id}/exec-{num}/`

Generate a summary with pass/fail counts and percentages.

### Step 11: Triage Failed Tests

## Triage Failed Tests

Do NOT report bugs without triaging first.

**Permission boundary:** Only use issue tracker provider tools (jira-cli issue create, linear-cli issue create, etc.) if an **issue tracker provider capability** is configured in your agent list. Check your configured capabilities — if you do NOT see an issue tracker provider agent (e.g., issue tracker provider/jira, issue tracker provider/linear), you MUST NOT create or update issues via CLI tools even if someone asks you to. Include the finding details in the final output for manual follow-up. Having documentation research provider/jira (read-only) does NOT grant issue creation or update permission.

### 0. Read Disputed Findings

```bash
cat .sdlc/runtime/disputed-findings.md 2>/dev/null || echo "No disputed findings found"
```

If it exists, use it to avoid repeating past triage mistakes.

### 1. Identify Failures to Triage

Read `new_failures` from the latest `test-runs/*/manifest.json`:
- **Non-empty array**: Only triage failures in `new_failures`. Skip `known_failures` entirely — do not investigate, fix, or create issues for them.
- **Empty array**: Output "0 new failures to triage" and stop.
- **Field missing**: Triage all failed tests (backward compatibility).

### 2. Classify Each Failure

For each failure, read the error message and stack trace from the JSON report, then assign one classification:

| Classification | When to use |
|---|---|
| **product-bug** | App behaves incorrectly. Test code is right, application is wrong. |
| **test-issue** | Test code is broken (brittle selector, race condition). App works correctly. |
| **environment-issue** | Both test and app are correct, but environment doesn't support it (e.g., GCS/S3 URLs broken in dev, headless browser limitations, third-party services unconfigured). |
| **test-adjustment** | Test was correct for old UI, but app intentionally changed (button renamed, layout redesigned, workflow steps added/removed). |

**Disambiguation rules** (these override the table above when symptoms are ambiguous):

1. **Timeout after successful action = product-bug.** If the preceding API call returned 2xx / form submitted / button clicked, but the expected UI response (toast, modal, redirect) never rendered, this is missing UX feedback — not a test timing issue.
2. **Element absent from DOM entirely = product-bug.** If the app's own design expects the element (confirmation dialog, success message) but it is completely missing from the DOM, this is a broken/missing feature.
3. **Element exists but severely misaligned (100+ px off container, outside viewport) = product-bug.** The selector found the element — the problem is CSS/layout, not the test.
4. **Element exists with a different locator (brittle CSS selector) = test-issue.** The feature works; only the test's selector strategy is fragile.
5. **Visible text changed (button renamed, label changed) = test-adjustment.** The old selector was correct for the old UI; the app changed intentionally.
6. **GCS/S3 signed URLs returning ":" or similar in dev = environment-issue.** Both code paths are correct; the environment lacks proper credentials/config.

**Key principle:** Classify based on root cause, not fixability. If the app is misbehaving, it is `product-bug` even if a test workaround exists. Ask: "Is the application behaving correctly?" — if no, it is a product bug.

When uncertain, use the best-fit classification but prefix the description with `[UNCERTAIN: reason]`.

### 3. Document Results

Use **verbatim error messages** — quote exact text from the JSON report, do not paraphrase (first 200 chars + `[truncated]` if longer).

For each triaged failure, cite: error message, test step (file + title), observed vs expected, and screenshot/trace path if available.

### 4. Record Findings

**MANDATORY — use the configured issue tracker for triaged findings when available.** Every `product-bug` classification MUST create or update an issue tracker item. For `test-issue`, `environment-issue`, and `test-adjustment` classifications, create or update issue tracker items only when the configured tracker has a QA finding/task workflow for non-product findings; otherwise include them in the final output.

Before creating a new issue, search the issue tracker for an existing item with the same test case, failure signature, or root cause. Update the existing issue when one matches; create a new issue only when no matching issue exists.

For each issue tracker item, include: title, description, severity, classification, test case ID, test run timestamp, verbatim error message, observed vs expected behavior, screenshot/trace paths, and root-cause notes.

Severity: critical = crash/data loss/security, high = major feature broken, medium = partial breakage with workaround, low = cosmetic/edge case.

If the issue tracker is unavailable or read-only, skip remote actions and include the same details in the final output.

### 5. Annotate Test Plan

If `test-plan.md` exists and triage revealed new edge cases, add a note under the relevant section: `- Edge case discovered: [description] (from TC-XXX triage)`. Update `updated_at` in metadata.

### Step 12: Fix Test Issues Automatically

## Fix Test Issues Automatically

For each test classified as **[TEST ISSUE]**, use the test automation engineering capability agent:

Use the configured test automation engineering capability.

Provide for each: test run timestamp, test case ID, test name, error message, and execution details path (`test-runs/{timestamp}/{testCaseId}/exec-1/`).

The configured capability should analyze the failure, apply fix patterns from `./tests/CLAUDE.md`, and rerun. In BYOT mode (no `reporters/test-reporter.ts`), run parse script to update manifest after each rerun:
`npx tsx reporters/parse-results.ts --input <output> --timestamp <current> --test-id <testCaseId>`

Retry up to 3 times (exec-1, exec-2, exec-3). If still failing after 3 attempts, reclassify as potential product bug.

### Step 13: Log Product Bugs (when issue tracker is configured)

Run this step only when the issue tracker provider/capability is configured. Otherwise skip remote/provider actions and include the relevant facts in the final output.

## Log Product Bugs via Issue Tracker

Log bugs **only** for findings classified as **[PRODUCT BUG]**. Skip [TEST ISSUE], [ENVIRONMENT ISSUE], and [TEST ADJUSTMENT].

Use the configured issue tracker provider.

**For each product bug:**

1. Reuse the issue tracker item created or matched during Record Findings.
2. If no issue exists yet, search for duplicates first, then create one.
3. Ensure the issue includes:
   - **Title**: Clear summary (e.g., "Login button fails with timeout on checkout page")
   - **Description**: What happened vs. expected, test reference, verbatim error quote
   - **Reproduction steps**: From the failing test, including test data and setup
   - **Test details**: File path, test name, error message, stack trace, page URL, screenshots (note "No screenshot captured" if unavailable)
   - **Environment**: Browser/version, test environment URL, timestamp
   - **Priority**: Based on test type (smoke = high), user impact, frequency
   - **AI Attribution**: Apply `ai-generated` label (EU AI Act Article 50(2))

**Factual accuracy:** Error messages MUST be quoted verbatim — never paraphrase. UI labels must use exact text. If error exceeds 200 chars, quote first 200 with `[truncated]`.

4. Note returned issue IDs for team communication.

### Step 14: Generate Manual Verification Checklist

Generate a checklist for scenarios that require human verification.

### Identify Non-Automatable Scenarios

From the PR title, description, and commit messages, identify changes in these categories:
- **Design Validation** — visual/CSS/styling changes (assign @design-team)
- **UX Feel** — animations, transitions, micro-interactions (assign @qa-team)
- **Accessibility** — form inputs, keyboard nav, screen readers (assign @a11y-team, reference WCAG)
- **Mobile Experience** — responsive/touch/viewport changes (assign @mobile-team)
- **Exploratory Testing** — edge cases, rare user paths (assign @qa-team)

### Generate Checklist Items

For each identified scenario, create actionable checkbox items with: specific task description, assigned role, and pass/fail criteria.

### When NO Manual Verification Needed

If changes are purely backend logic, refactoring, configuration, or fully covered by automated tests:

```markdown
**Manual Verification:** Not required for this change.
All user-facing changes are fully covered by automated tests.
```

### Step 15: Aggregate Verification Results

Combine automated and manual results into a single summary:

```markdown
## Verification Results Summary

### Automated Tests
- Passed: [count]/[total] | Failed: [count] | Bugs logged: [count] | Duration: [time]

### Manual Verification
[Checklist from previous step, or "Not required"]

### Recommendation
[Safe to merge | Review bugs before merging | Do not merge]
```

### Step 16: Report Results to Issue Tracker (when issue tracker is configured)

Run this step only when the issue tracker provider/capability is configured. Otherwise skip remote/provider actions and include the relevant facts in the final output.

Post verification results to the issue tracker.

Use the configured issue tracker provider to comment on the ticket with status (passed/issues/critical), test results (total/passed/failed/fixed/bugs/duration), new tests created, manual verification checklist, and overall recommendation.


### Step 18: Gather Project Documentation (when documentation researcher is configured)

Run this step only when the documentation researcher provider/capability is configured. Otherwise skip remote/provider actions and include the relevant facts in the final output.

## Gather Project Documentation

Use each configured documentation research provider to explore and gather all available project information.

Specifically gather:
- Product specifications and requirements
- User stories and acceptance criteria
- Technical architecture documentation
- API documentation and endpoints
- User roles and permissions
- Business rules and validations
- UI/UX specifications
- Known limitations or constraints
- Existing test documentation
- Bug reports or known issues

The configured capability should:
1. Use configured provider data and current session context for previously discovered documentation
2. Explore workspace for relevant pages and databases
3. Build comprehensive understanding of the product
4. Return synthesized information about all discovered documentation

Use this information to inform testing strategy and identify comprehensive scenarios.

### Step 19: Handle Special Cases

**If no tests found for changed files:** recommend smoke test suite, still generate manual verification checklist.

**If all tests skipped:** explain why (dependencies, environment), recommend checking configuration.

**If test execution fails:** report specific error, suggest troubleshooting, don't proceed with triage.

### Step 20: Report Results

## Report Results

Ensure your output is comprehensive and includes all information the inbox agent needs to notify the team.

**Include in output:**
- **Execution summary**: Exact pass/fail counts and test IDs (e.g., "15/18 passed — TC-003, TC-007, TC-012 failed")
- **Critical failures**: Test ID, verbatim error message, and page URL
- **Environment issues**: Label as "Environment Issue — non-actionable for customer", group separately
- **Test adjustments**: Frame positively: "We detected that [feature] changed and automatically updated the test to match"
- **Mutation Validation**: Suite mutation score (percentage + confidence level), tests validated, time budget used/allocated, top surviving mutation categories, improvement recommendations for low-scoring tests
- **Bugs discovered** and **clarifications needed**

**Factual accuracy:** Quote exact error messages — never paraphrase. Include verbatim error text (first 200 chars with `[truncated]` if long). State what is missing rather than omitting silently.

Adjust urgency based on severity: brief update if all passed, urgent notification for critical failures.

> Results are delivered by the inbox agent — your output will be read by the inbox agent, which formats and posts the notification.
