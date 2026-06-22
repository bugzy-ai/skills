---
name: generate-test-cases
description: Generate QA test cases, automation coverage, validation artifacts, and coverage updates from a QA test plan. Use when the user asks to create cases, automate coverage, expand a plan, or update cases from feedback.
---

# Generate Test Cases

Follow this workflow in order. The skill body is self-contained: use the user's request, repository files, runtime artifacts, and configured capabilities/providers available in the current session.

## Capability and provider usage

When a step names a configured capability or provider, use the matching installed skill, CLI, MCP server, or inline tools available in the current session. If a required capability is unavailable, report it as a blocker before attempting unsupported work. If an optional provider is unavailable, continue from local artifacts and include the skipped provider action in the final report.

### Required capabilities

- browser automation: required for the full workflow.
- test engineer: required for the full workflow.
- test case manager: required for the full workflow.

### Optional providers

- documentation researcher: use when configured.

## Workflow

### Step 1: Generate Test Cases Overview

Create test cases and automation coverage artifacts. Read `./tests/CLAUDE.md` for framework conventions, directory structure, and commands.

**IMPORTANT**: You MUST complete ALL phases below in order. Do NOT skip any phase — each one is a required deliverable.

**Phase 1 — Context & Planning:** Read security notice, parse arguments, read `test-plan.md`, check existing test cases via test case management provider, gather documentation (if configured), explore the application to discover UI elements, and handle any ambiguities via the clarification protocol.

**Phase 2 — Scenario Design:** Organize discovered scenarios by feature area with category assignments (critical paths, happy paths, error handling, edge cases, API tests) and tag assignments.

**Phase 3 — Test Cases:** Create or update ALL test cases through the configured test case management provider before automation. Cross-reference against exploration findings to ensure no discovered features are missed.

**Phase 4 — Automation:** use the test automation engineering capability area by area to create or update automation artifacts following project framework conventions. Run tests until passing or document product bugs.

**Phase 5 — Quality Validation:** Generate cleanup fixtures for data-creating tests. Run mutation validation using `page.route()` to inject faults into network responses — write results to `test-runs/{timestamp}/mutation-report.json`. This phase is mandatory.

**Phase 6 — Artifact Updates:** Update `test-plan.md` with coverage status. Validate all generated test cases and automation artifacts. Ensure required directories exist. Extract environment variables to `.env.testdata`. Log any feedback-driven updates.

**Phase 7 — Report:** Provide a final summary including mutation validation results, then report results for team notification.

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

Arguments: the user's current request and any explicit skill arguments

Parse: **type** (exploratory|functional|regression|smoke, default: functional) and **focus** (optional feature filter).

### Step 4: Gather Context

**Read Test Plan:** Read `test-plan.md` for test items, automation strategy, pass/fail criteria, and environment requirements.

**Check Existing Artifacts:** Use the configured test case management provider to list existing test cases and determine the next available test case ID. Review existing automation coverage and conventions (see `./tests/CLAUDE.md`). Avoid creating overlapping test cases or duplicate automation.

### Step 5: Gather Project Documentation (when documentation researcher is configured)

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

### Step 6: Exploration Protocol

## Exploratory Testing Protocol

Before creating or running formal tests, explore the application to validate requirements and understand actual behavior.

### Adaptive Depth

Choose exploration depth based on requirement clarity. For new projects, default one level deeper.

**Quick** (requirements CLEAR — detailed criteria, specific URLs/fields):
Navigate to feature, verify it loads, confirm key elements exist, capture screenshot. If it matches requirements → proceed to test creation. If discrepancies → escalate to Moderate.

**Moderate** (requirements VAGUE — general direction but specifics missing):
Test primary user flow end-to-end, document steps and behavior, capture before/after screenshots. Compare to requirements: what matches, what differs, what's absent. Identify ambiguities with concrete examples. Minor ambiguity → proceed with documented assumptions. Critical → escalate to Deep or Clarification Protocol.

**Deep** (requirements UNCLEAR — contradictory info, multiple interpretations):
Define exploration matrix (user roles, feature states, input variations). Test systematically, document patterns and differences. Critical ambiguities → STOP and clarify via Clarification Protocol.

### Verify Features Exist Before Testing

**Always confirm referenced features actually exist in the application.**
- If an authoritative trigger (Jira ticket, PR, team request) asserts the feature exists but you cannot find it → treat as **execution obstacle** (proceed with artifacts, notify team). Do NOT block.
- If NO authoritative source claims it exists → **CRITICAL severity** — escalate via Clarification Protocol. Do NOT silently substitute a different feature.
- **Finding a similar but different feature does NOT resolve the ambiguity.** If the user asks for "Checkout page" and you find a cart page, that's NOT the same thing — you must still clarify.

### API Endpoint Discovery

During exploration, actively look for API endpoints via:
- Documentation files (docs/, openapi.yaml, swagger.json, api-reference.md)
- Route definitions (Express routes, Next.js API routes in app/api/ or pages/api/)
- **Network requests during live browsing (IMPORTANT when no API docs exist):** After navigating to each page during exploration, ask the browser automation capability capability to run `playwright-cli network` to list all captured HTTP requests. Filter for XHR/fetch API calls (ignore static assets). For example, loading /inventory may reveal GET /api/products — document every API endpoint you observe. This is often the ONLY way to discover backend APIs in SPAs.
- Environment variables referencing API URLs

If endpoints are discovered, document: base URL, endpoints with HTTP methods, authentication requirements (Bearer, API key, session), and whether public or internal. Include in exploration report under "API Endpoints." If none found, skip — not all projects have testable APIs.

### Document Exploration Results

Use verbatim UI text in all notes — quote exact button labels, headings, form field names, and toast messages as rendered on screen. Do not paraphrase. If a page is blank or loading, document: "Page at [URL] rendered no visible text after [N] seconds."

Save findings as a report in `./exploration-reports/` including:
- Date and exploration depth used
- Features found and their current behavior
- Discrepancies between requirements and actual observations
- Assumptions made (if proceeding despite ambiguity)
- Screenshots and artifacts collected
- API endpoints discovered (if any)

When you cannot confidently determine application behavior, state "Unable to determine: [what was attempted and what was observed]" rather than guessing.

### Step 7: Clarification Protocol

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

### Step 8: Organize Test Scenarios by Area

Group test scenarios by feature area (e.g., Authentication, Dashboard, Checkout). Each area should be a logical, independent grouping aligned with navigation structure.

**When to ask vs when to proceed:**
- If the user's request references a SPECIFIC page/feature that doesn't exist (e.g., "test the Checkout page" when there's no /checkout), this is a CRITICAL clarification — include a blocked section in your output asking which page they meant before generating tests.
- If the user lists multiple features and some don't exist, skip the absent ones and generate tests for everything that DOES exist. Mention what was skipped in your summary.
- For contradictory or undefined requirements, use the Clarification Protocol.
- Maximize useful coverage: generate error handling, edge cases, and negative tests for every discovered feature when they add meaningful risk coverage.

**Categorize scenarios per area:**
1. **Critical User Paths** — login, core workflows, critical transactions (must automate)
2. **Happy Path Scenarios** — standard workflows, common use cases
3. **Error Handling** — validation errors, network errors, permission errors
4. **Edge Cases** — rare scenarios, complex exploratory, visual/UX validation
5. **API Endpoint Tests** — CRUD operations, auth verification, error responses, contract testing

**Tag Assignment:** Critical paths → [smoke], Happy paths → [regression], Error handling → [regression, error-handling], API tests → [api, regression]. Add area name as tag (e.g., [smoke, authentication]).

**Output:** Scenarios organized by area with automation decisions and suite assignments.

### Step 9: Generate All Test Cases

Create or update ALL test cases BEFORE using the test automation engineering capability. Use the configured test case management provider and follow existing naming conventions.

Each test case must include: required metadata (id, title, type, area, tags, automation status/reference), clear steps with expected results, and test data references (env var names, not values).

**`ai_generated: true` in test case metadata is a legal requirement under EU AI Act Article 50(2) — do NOT omit.** Follow existing test case format; if none exist, provide the full template in the capability handoff.

### Step 10: Cross-Reference Exploration Recommendations

## Cross-Reference Exploration Recommendations

**Skip if** user requested a single or narrowly focused test case. Only valuable during bulk generation.

### 1. Find Exploration Report

Locate the most recent file in `./exploration-reports/` matching the current focus area. Look for the `## Recommended Test Cases` section. If none exists, skip this step.

### 2. Cross-Reference

1. Parse recommended scenarios (each tagged `[ACTION]`, `[STATE]`, `[PAGE_LOAD]`, etc.)
2. Use the configured test case management provider to list existing test cases.
3. Match by action description similarity and category. A broader test case can cover a recommendation.

### 3. Fill Gaps

For unmatched recommendations, use the configured test case management provider to create missing test cases following existing format and naming conventions.

### 4. Output Summary

```
Cross-Reference: [filename]
Recommended: [N], Covered: [M], Gaps: [N-M]
Gap-fill TCs created: TC-XXX, TC-YYY, ...
```

### Step 11: Automate Test Cases Area by Area

Process each feature area separately for incremental, focused test creation.

**For each area, use test automation engineering capability:**

Use the configured test automation engineering capability with: area name, test case IDs/specifications selected for automation, test type from arguments, test-plan.md reference, and existing automation conventions from `./tests/CLAUDE.md`.

**API test cases (test_layer: api):** Use the project's API automation conventions from `./tests/CLAUDE.md`. No browser launched unless the project convention requires one.

**Automation patterns:** Include any relevant project conventions provided in the current task context in the handoff to the test automation engineering capability.

**The configured capability should:** read test cases for the area, check existing automation conventions, explore the feature for selectors/URLs/flows, create or update automation artifacts for selected cases, update each test case automation status/reference, run tests until passing or documenting product bugs, and update .env.testdata.

**AI Attribution:** Add `// Generated by AI` as first line of every created file. Legal requirement under EU AI Act Article 50(2).

**Verify area completion:** test cases updated with automation references, automation artifacts created or updated, and tests passing (or bugs documented). Then move to the next area.

### Step 12: Generate Cleanup Fixtures

## Generate Cleanup Fixtures

After automated tests have been created, identify which tests create mutable data and generate cleanup fixtures so test suites remain idempotent across repeated runs.

### Step 1: Classify Generated Tests

Scan all newly generated automation artifacts and classify each as:

| Classification | Examples | Needs Cleanup? |
|----------------|----------|---------------|
| **Data-creating** | Form submissions, user creation, record inserts, file uploads, order placement | Yes |
| **Read-only** | Page navigation, UI verification, dropdown checks, text assertions | No |
| **Modifies-then-deletes** | Test that creates and deletes own data within the same flow | Optional (safety net) |

**Skip read-only tests entirely** — do not add cleanup fixtures to tests that only navigate and verify.

### Step 2: Generate Cleanup Fixture File

Use the configured test automation engineering capability to create `tests/fixtures/cleanup.fixture.ts` following the pattern from `testing-best-practices.md`:

```typescript
// tests/fixtures/cleanup.fixture.ts
import { test as pagesTest } from './pages.fixture';

export const test = pagesTest.extend<CleanupFixtures>({
  withXxxCleanup: [
    async ({ page }, use) => {
      await use();  // Run the test first
      // POST-TEST CLEANUP — runs after test completes (pass or fail)
      await cleanupXxx({ page });
    },
    { auto: false },  // Must be explicitly requested in test parameters
  ],
});
export { expect } from '@playwright/test';
```

**Key rules:**
- Extend from `pages.fixture.ts` (not base Playwright test)
- `await use()` runs the test first, cleanup runs after
- `{ auto: false }` — test must destructure the fixture to activate it
- One `withXxxCleanup` fixture per data type (e.g., `withAbsenceCleanup`, `withOrderCleanup`)
- Cleanup must handle errors gracefully (try-catch, non-blocking)
- If a cleanup fixture file already exists, extend it rather than overwriting

### Step 3: Wire Data-Creating Tests

For each data-creating test:
1. Change import from `../../fixtures/pages.fixture` to `../../fixtures/cleanup.fixture`
2. Add the cleanup fixture to the test's destructured parameters
3. Add `void withXxxCleanup;` to satisfy TypeScript

### Step 4: API Test Cleanup

Tests using the `request` fixture (no `page`) need API-based cleanup:
- Use DELETE endpoints or API calls for cleanup instead of UI navigation
- If no DELETE endpoint exists, document as a known limitation with a `// TODO: No API cleanup available` comment

### Step 5: Handle Edge Cases

- **No cleanup possible**: If the application doesn't expose delete functionality (no UI delete, no API endpoint), add a `// TODO: Manual cleanup required — app does not expose delete for [entity]` comment. Do not fail.
- **Admin-gated cleanup**: If data can only be deleted by admin users, use admin credentials from `.env.testdata` (e.g., `TEST_ADMIN_EMAIL`, `TEST_ADMIN_PASSWORD`) in the cleanup fixture.
- **Privacy/visibility**: When applicable, ensure test data is created with settings that make it visible to admin cleanup (e.g., `privacy="Yes"`).
- **Existing tests**: Only apply cleanup to newly generated tests. Do not refactor existing tests that lack cleanup.

### Step 13: Validate Test Quality via Mutations

## Validate Test Quality via Mutations

Inject faults into network responses using Playwright's `page.route()` interception and measure how many the tests detect.

This works for **any web application** — API-driven SPAs, server-rendered apps, and form-based UIs alike. Any network request the browser makes (API calls, form POSTs, page navigations, XHR/fetch) can be intercepted and mutated.

### Skip Conditions

Skip this phase entirely if:
- All tests failed in the initial run (no passing tests to validate)
- The user explicitly requested no mutation validation
- Fewer than 2 interceptable network requests were discovered across all passing tests (insufficient surface area)

If skipped, note the reason in your output and move to the next step.

### 1. Endpoint Discovery

Identify which network requests each passing test exercises:

1. Read the latest `test-runs/{timestamp}/manifest.json` to get the list of **passing** tests
2. For each passing test, create a lightweight Playwright script that uses `page.on('request')` and `page.on('response')` to log **all** network requests:
   - URL, HTTP method, resource type (document, xhr, fetch, form), response content-type, response status code, response body sample (first 500 chars)
3. Write discovered requests to `test-runs/{timestamp}/mutation-endpoints.json`

**Include for mutation** (any of these are valid mutation targets):
- API endpoints (REST, GraphQL) — full operator set
- Form submissions (POST requests from forms) — status/timing mutations
- Page/document navigations (HTML responses) — status/timing mutations
- XHR/fetch requests — full operator set for JSON, status/timing for others

**Exclude from mutation:**
- Auth endpoints matching denylist patterns: `/auth/*`, `/login`, `/logout`, `/oauth/*`, `/token`, `/.well-known/*`
- Static assets: `.js`, `.css`, `.png`, `.svg`, `.woff`, `.ico`, `.map` files
- Analytics/tracking endpoints (e.g., Google Analytics, Sentry, Segment)
- Binary content (images, PDFs, file downloads) — these get only status/timing mutations

### 2. Mutation Operator Reference

Apply mutations from this curated operator set, organized by category:

| Category | Operator | Mutation | Example |
|----------|----------|----------|---------|
| Data | null-field | Replace a required field with `null` | `{ "price": null }` |
| Data | empty-array | Replace array with `[]` | `{ "items": [] }` |
| Data | zero-numeric | Replace numeric value with `0` | `{ "price": 0 }` |
| Data | empty-string | Replace string with `""` | `{ "name": "" }` |
| Data | boolean-flip | Flip boolean values | `{ "active": false }` → `true` |
| Data | boundary-value | Replace with MAX_SAFE_INTEGER or negative | `{ "count": -1 }` |
| Data | string-truncation | Truncate string to 1 char | `{ "title": "A" }` |
| Status | server-error | Return HTTP 500 | `route.fulfill({ status: 500, body: '{"error":"Internal Server Error"}' })` |
| Status | service-unavailable | Return HTTP 503 | `route.fulfill({ status: 503 })` |
| Status | unauthorized | Return HTTP 401 | `route.fulfill({ status: 401 })` |
| Status | rate-limited | Return HTTP 429 | `route.fulfill({ status: 429 })` |
| Timing | slow-response | Add 10s delay before response | `await new Promise(r => setTimeout(r, 10000))` |
| Timing | timeout | Add 30s delay (exceed typical test timeout) | `await new Promise(r => setTimeout(r, 30000))` |
| Structure | missing-field | Remove a required field from response | `delete body.id` |
| Structure | wrong-type | Change content-type header | `content-type: text/plain` |
| Structure | malformed-json | Return invalid JSON | `route.fulfill({ body: '{invalid' })` |
| Structure | empty-body | Return empty response body | `route.fulfill({ body: '' })` |
| Structure | extra-field | Add unexpected field | `{ ...body, "__mutation": true }` |

### 3. Mutation Execution Protocol

For each passing test:

1. **Select operators**: Choose up to 5 most applicable mutation operators based on the request type and response shape:
   - **JSON API/XHR/fetch responses**: prefer data mutations (null-field, empty-array, zero-numeric) + status mutations
   - **Form submissions (POST)**: use status mutations (500, 503) + timing mutations (slow-response)
   - **Page navigations (HTML)**: use status mutations (500, 503) + timing mutations
   - **All request types**: include at least one status mutation (server-error)
   - Skip data/structural mutations for non-JSON responses (HTML, binary)

2. **Create mutation wrapper**: For each (test, operator) pair, create a Playwright test that applies `page.route()` before running the original test logic:

```typescript
// Example mutation wrapper pattern
test('TC-001 mutation: null-field on /api/products', async ({ page }) => {
  await page.route('**/api/products', async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    json.name = null; // Apply null-field mutation
    await route.fulfill({ response, body: JSON.stringify(json) });
  });
  // ... run original test logic
});
```

3. **Run in isolation**: Execute each mutated test independently. Record pass/fail.

4. **Interpret results**:
   - Test **fails** under mutation → mutant **killed** ✅ (test caught the defect)
   - Test **passes** under mutation → mutant **survived** ⚠️ (gap in test assertions)

5. **Time budget enforcement**: Track cumulative time spent on mutation runs. Stop when the time budget is exceeded: **2× the initial test run duration** (read from manifest's startTime/endTime). When stopping early, note how many mutations were completed vs planned.

**IMPORTANT**: Check for existing `page.route()` calls in the test before adding mutations. If the test already has route handlers, skip it to avoid conflicts.

### 4. Flakiness Filter

Before counting any result in the mutation score:

- If the test **failed in the initial run** (without mutation): exclude entirely from mutation validation
- If the test is listed in `known_failures` in the manifest: exclude from score calculation
- For survived mutants: re-run once to confirm survival (rule out flaky kill)

Only count confirmed results in the final score.

### 5. Score Calculation and Reporting

Calculate mutation scores at two levels:

**Per-test score**: `killedMutants / totalMutants` for each test
**Per-suite score**: aggregate killed/total across all tests

Write results to `test-runs/{timestamp}/mutation-report.json`:

```json
{
  "suiteScore": { "killed": 12, "survived": 3, "total": 15, "percentage": 80 },
  "byTest": {
    "TC-001-login": {
      "killed": 4, "survived": 1, "total": 5, "percentage": 80,
      "survivingMutants": [
        { "operator": "null-field", "endpoint": "/api/user", "description": "Test does not validate user.name field presence" }
      ]
    }
  },
  "timeBudget": { "allocatedMs": 60000, "usedMs": 45000, "exhausted": false },
  "skippedTests": ["TC-005-checkout (known_failure)"]
}
```

**Confidence classification**:

| Score | Confidence | Meaning |
|-------|-----------|---------|
| >80% | High | Tests catch most behavioral changes |
| 60-80% | Moderate | Tests cover happy paths but miss edge cases |
| <60% | Low | Tests may be superficial — recommend improvement |

### 6. Test Improvement Hints

For each surviving mutant, generate an actionable improvement hint:

- "TC-001: survived `null-field` on `/api/products` — test doesn't validate field presence. Add: `expect(product.name).toBeTruthy()`"
- "TC-003: survived `zero-numeric` on `/api/cart/total` — test doesn't assert price values. Add: `expect(total).toBeGreaterThan(0)`"
- "TC-007: survived `server-error` on `/api/orders` — test doesn't handle error states. Add error boundary assertion."

If any test scores below 60% mutation kill rate, flag it for potential assertion strengthening in the output.

### 7. Include in Output

Include mutation validation results in your output for the inbox agent:
- Suite mutation score with confidence level (e.g., "Mutation Score: 83% (High confidence)")
- Number of tests validated and mutations applied
- Time budget usage (e.g., "45s of 60s budget used")
- Top surviving mutation categories (e.g., "Data mutations had lowest kill rate")
- Improvement recommendations for low-scoring tests

### Step 14: Update Test Plan (Living Document)

**MANDATORY — Do not skip this step.** After generating test cases, you MUST modify `test-plan.md`:
1. Mark each covered feature with ✅ and TC-XXX ID (e.g., `- [x] Feature 1 ✅ TC-007`)
2. Add any newly discovered scenarios
3. Update `updated_at` in metadata
4. **Verify:** After saving, confirm `test-plan.md` was actually modified (not just read)

Skip only if `test-plan.md` does not exist.

### Step 15: Validate Generated Test Artifacts

## Validate Generated Test Artifacts

Verify all generated artifacts meet quality standards per `./tests/CLAUDE.md`:

- **Test cases**: Unique TC-XXX ID, `automated: true/false` metadata, human-readable steps, env vars for test data
- **Automation artifacts**: Reference test case IDs, follow conventions and selector priority from `./tests/CLAUDE.md`, no hardcoded test data
- **Automation support abstractions**: Follow conventions from `./tests/CLAUDE.md`, contain only actions (no assertions)
- **All artifacts**: Valid TypeScript, use environment variables

### Step 16: Create Directories if Needed

Ensure required directories exist through the configured provider and project framework conventions. Create automation directories from `./tests/CLAUDE.md` as needed.

### Step 17: Extract Environment Variables

## Extract Environment Variables

Scan test plan and test cases for TEST_* variable references.

**Secret detection:** Variables containing PASSWORD, SECRET, TOKEN, KEY, CREDENTIALS, or API_KEY in the name are secrets — add to `.env` only, **never** to `.env.testdata`.

**Process:**
1. Scan for TEST_* references in test plan and test cases
2. Secret names → skip (goes in .env only)
3. Known values → add to .env.testdata
4. Unknown values → add with empty value and `# TODO: team to configure`
5. Preserve existing variables

The `.env.testdata` file MUST begin with `# Generated by AI`.


### Step 19: Log Feedback-Driven Updates

If this generation was triggered by user feedback (e.g., "update steps in TC-001"), log the change after modifying the test case:
`test-cases log-update --file-path "<path>" --change-type "content"`

If `test-cases` is not available, skip logging — do not fail the task.

### Step 20: Final Summary

**Before summarizing:** Verify you completed the Mutation Validation step. If you have not yet run mutation validation (using `page.route()` to inject faults and create `mutation-report.json`), go back and complete it now before writing this summary.

Provide a summary: test cases (count, IDs), automation artifacts (count), coverage by area, mutation validation results (score and confidence), and run command (from `./tests/CLAUDE.md`).

### Step 21: Report Results

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
