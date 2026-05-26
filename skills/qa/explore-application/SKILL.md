---
name: explore-application
description: Explore a web application to map UI surfaces, workflows, behavior, risks, and actionable QA findings. Use when onboarding a project, investigating an application area, or asked to discover how a UI behaves.
---

# Explore Application

Follow this workflow in order. The skill body is self-contained: use the user's request, repository files, runtime artifacts, and configured Bugzy capabilities/providers available in the current session.

## Capability and provider usage

When a step names a configured capability or provider, use the matching installed skill, CLI, MCP server, or inline tools available in the current session. If a required capability is unavailable, report it as a blocker before attempting unsupported work. If an optional provider is unavailable, continue from local artifacts and include the skipped provider action in the final report.

### Required capabilities

- browser automation: required for the full workflow.

## Workflow

### Step 1: Explore Application Overview

Discover actual UI elements, workflows, and behaviors using the browser automation capability agent. Updates test plan and project documentation with findings.

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

**Arguments**: the user's current request and any explicit skill arguments

**Parse:**
- **focus**: auth, navigation, search, content, admin (default: comprehensive)
- **depth**: shallow (15-20 min) or deep (45-60 min, default)
- **system**: target system (optional for multi-system setups)

### Step 4: Exploration Protocol

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

### Step 5: Create Exploration Test Case

## Create Exploration Test Case

Create a temporary exploratory test case through the configured test case provider with id `EXPLORATION-TEMP`, type `exploratory`, priority `high`, and a title based on the focus area (or "Comprehensive"). Include preconditions (cleared browser, target environment access, credentials from .env.testdata), exploration steps based on the focus area, and expected outputs (selectors, navigation patterns, feature behaviors, screenshots, console errors).

This temporary test case is only for the current exploration run and should be removed or closed after exploration.

### Step 6: Run Exploration

## Run Exploration

Use the configured browser automation capability.

Execute the temporary exploratory test case in exploration mode. Take screenshots of every significant UI element and page. Document all clickable elements with selectors, URL patterns, load times, console errors, and which features are accessible vs restricted. Organize screenshots by functional area.

**Output location:** `./test-runs/[timestamp]/EXPLORATION-TEMP/` containing findings.md, test-log.md, screenshots/, and summary.json.

### Step 7: Process Exploration Results

## Process Exploration Results

Read the browser automation capability output from `./test-runs/[timestamp]/EXPLORATION-TEMP/` (find latest with `ls -t test-runs/ | head -1`). Parse findings.md, test-log.md, screenshots/, and summary.json.

Extract and organize: discovered features, UI element selectors, navigation structure/URLs, authentication flow, performance observations, and areas needing further investigation.

**Citation requirements — for each finding include:**
- **Page URL**: exact URL where observed
- **Screenshot**: specific filename from screenshots/ (or "no screenshot captured")
- **Source file**: which output file the finding came from

**Use verbatim UI text:** Quote exact button labels, headings, form field names, and toast/alert messages — do not paraphrase. If a page rendered no visible text, document: "Page at [URL] rendered no visible text after [N] seconds."

**Output:** Structured findings ready for artifact updates.

### Step 8: Update Exploration Artifacts

## Update Exploration Artifacts

### Update Test Plan
Read and update `test-plan.md`: replace [TO BE EXPLORED] markers with concrete findings, add newly discovered features, update navigation patterns/URLs, document actual authentication methods, and add new environment variables if discovered.

### Create Exploration Report
Create `./exploration-reports/[timestamp]-[focus]-exploration.md` starting with `<!-- Generated by Bugzy AI — https://bugzy.ai -->`.

Include sections: Key Discoveries, Feature Inventory, Navigation Map, Recommendations, and Recommended Test Cases.

**Recommended Test Cases section:** List ALL testable scenarios discovered. Classify each with a category tag:

- **[PAGE_LOAD]** — Page loads, initial state, heading/count verification
- **[ACTION]** — Click, submit, download, or other user-triggered behavior
- **[STATE]** — Element visibility, enabled/disabled states, conditional display
- **[VIEW_MODE]** — Grid/table/list view switching and display validation
- **[NAVIGATION]** — URL routing, sidebar links, breadcrumbs, pagination
- **[FILTER]** — Search, sort, filter, date range functionality
- **[FORM]** — Input validation, form submission, field behavior
- **[ERROR]** — Error messages, boundary conditions, invalid input handling

Format: `1. **[CATEGORY]** Description of the testable scenario`

### Step 9: Cleanup Temporary Artifacts

## Cleanup Temporary Artifacts

Remove or close the temporary exploratory test case created for this run.

**Note:** Test run results in `./test-runs/` are preserved for reference.


### Step 11: Report Results

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
