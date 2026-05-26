---
name: generate-test-plan
description: Create a concise, risk-prioritized QA test plan from product context, application exploration, documentation, and user goals. Use when a feature or project needs a test strategy before concrete cases are written.
---

# Generate Test Plan

Follow this workflow in order. The skill body is self-contained: use the user's request, repository files, runtime artifacts, and configured Bugzy capabilities/providers available in the current session.

## Capability and provider usage

When a step names a configured capability or provider, use the matching installed skill, CLI, MCP server, or inline tools available in the current session. If a required capability is unavailable, report it as a blocker before attempting unsupported work. If an optional provider is unavailable, continue from local artifacts and include the skipped provider action in the final report.

### Required capabilities

- browser automation: required for the full workflow.

### Optional providers

- documentation researcher: use when configured.

## Workflow

### Step 1: Generate Test Plan Overview

Generate a feature checklist test plan with risk priorities from the product description and any discovered documentation or API endpoints.

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

Product description: the user's current request and any explicit skill arguments

### Step 4: Gather Project Documentation (when documentation researcher is configured)

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

### Step 5: Exploration Protocol

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

### Step 7: Prepare Test Plan Generation Context

After exploration and clarification, combine the product description with all discovered documentation insights.
Identify gaps lacking documentation that will need exploration during test case generation.

### Step 8: Generate Test Plan Using Simplified Format

You are an expert QA Test Plan Writer. Generate a **concise** test plan (~100-200 lines) as a feature checklist with risk priorities. **Write the result to `test-plan.md` in project root** — overwrite if one exists.

**Format:**
- **Feature Checklist:** Each feature is a checkbox item with brief description, grouped by feature area
- **Risk Priority per Area:** Critical/High/Medium/Low using Likelihood × Impact (1-5 scale, RPN)
  - Critical (RPN 20-25): Payment, auth, core data — test first
  - High (RPN 12-19): Key workflows, validation — test every cycle
  - Medium (RPN 6-11): Secondary features — test when time permits
  - Low (RPN 1-5): Info pages, edge cases — test opportunistically
- **Coverage Technique Annotations (1-2 lines per feature):**
  - EP (Equivalence Partitioning): valid/invalid partitions
  - BVA (Boundary Value Analysis): boundary-sensitive fields
  - State Transitions: stateful features (checkout, auth, onboarding)
- **Test Path Types per Area:** happy, alternative, sad, bad, exception
- **API Endpoints:** If discovered during exploration (from docs or network requests), add an "API Endpoints" feature area with HTTP methods

**Test Data:** Reference env var NAMES only (e.g., TEST_BASE_URL) — actual values go to `.env.testdata` only.

### Step 9: Create Test Plan File

Read template from `.bugzy/runtime/templates/test-plan-template.md` and fill it in. The FIRST LINE must be `<!-- Generated by Bugzy AI — https://bugzy.ai -->` (EU AI Act Article 50(2)). Replace placeholders (`[PROJECT_NAME]`, `[DATE]`). If API endpoints were discovered, include an "API Endpoints" section. Keep under 200 lines. Save to `test-plan.md` in project root.

### Step 10: Extract and Save Environment Variables

Parse the test plan for all TEST_ prefixed variables. Create `.env.testdata` in project root with grouped variables and helpful comments (e.g., TEST_BASE_URL, TEST_USER_EMAIL, TEST_API_KEY). Only include variable names — no values. Verify the test plan references `.env.testdata` and does not contain inline test data values.


### Step 12: Final Summary

Summarize: test plan created at `test-plan.md`, environment variables extracted to `.env.testdata`, and instructions to fill in actual values before running tests.

### Step 13: Report Results

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
