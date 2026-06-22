---
name: browser-automation
description: Execute browser QA flows with Playwright, inspect DOM and network state, capture evidence, and produce structured results. Use when a task needs live browser interaction, UI exploration, test execution, screenshots, traces, or video evidence.
---

# Browser Automation

Use this skill for browser-driven QA workflows. Playwright is the current automation backend. Follow the command, authentication, evidence, and output rules below. If the required browser tooling or credentials are unavailable, report the blocker without exposing secrets.

## Operating instructions

You execute test cases through browser automation with video evidence capture.

**Setup:**
1. Read `.sdlc/runtime/templates/test-result-schema.md` for summary.json and steps.json format.
2. Read `.env.testdata` for TEST_* values. Secrets are process env vars. Never read `.env`.
3. Use configured provider/session data or explicit user input for environment and constraints.

**Execution:**
1. Parse test case: extract steps, expected behaviors, test data. Replace ${TEST_*} from .env.testdata or process env.
2. Auth: if TEST_STAGING_USERNAME/PASSWORD set and URL contains "staging", inject into URL: `https://user:pass@staging.domain.com/path`.
3. OAuth Auth: if env vars like *_ACCESS_TOKEN or *_ID_TOKEN are set (e.g., ADMIN_USER_ACCESS_TOKEN), you MUST authenticate using the correct method for the app — do NOT blindly inject raw tokens into localStorage. **Step 1: Detect auth method.** Navigate to the app's login page and check: does the page source or network requests reference Supabase (`supabase.co`, `sb-` keys)? Firebase (`firebaseapp.com`)? Auth0 (`auth0.com`)? **Step 2a: If Supabase detected** (most common): use `run-code` to POST the id_token to Supabase's REST API: `fetch(SUPABASE_URL + '/auth/v1/token?grant_type=id_token', { method: 'POST', headers: { 'apikey': ANON_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: 'google', id_token: process.env.PREFIX_ID_TOKEN }) })`. Extract the SUPABASE_URL and ANON_KEY from the page source. The response contains a valid session — store it in localStorage under `sb-*-auth-token`. **Step 2b: If no auth intermediary**: inject tokens directly into localStorage/cookies/sessionStorage. **Step 3:** Navigate/reload and verify the app shows authenticated state. If it redirects to login, the id_token may be expired or the detection was wrong — report clearly.
4. Check SDLC_EXECUTION_ID env var. Create folder: `<test-run-path>/<test-case-id>/`.
5. Execute via playwright-cli: `open <url>` (video auto-starts), use `snapshot` for element refs, track videoTimeSeconds per step, close browser.

**playwright-cli patterns:**
- **Re-snapshot after every DOM-changing action.** Refs (e1, e2...) are only valid for the current snapshot. After click, fill, select, goto, reload, or any action that mutates the DOM, run `snapshot` before using new refs. You do NOT need to re-snapshot after hover or screenshot. If you get "Element ref not found", always snapshot and retry with new refs — never fall back to run-code to bypass stale refs.
- **Use `fill` for standard forms, `type` for autocomplete.** `fill <ref> <text>` clears the field and sets the value atomically (default for 90% of inputs). `type <text>` sends keystrokes one-by-one into the focused element (needed for search-as-you-type, autocomplete dropdowns that need keydown events). Use `fill <ref> <text> --submit` to fill and press Enter in one command.
- **Handle dialogs BEFORE the triggering action.** `dialog-accept` or `dialog-dismiss` registers a one-time handler. Call it before clicking buttons that trigger alert/confirm/prompt dialogs. If the CLI hangs after a click, an unhandled dialog is the likely cause — issue dialog-accept as recovery.
- **Use `run-code` selectively for complex logic.** When you need waitForResponse (network waits), filechooser events, conditional branching, or complex waits, use `run-code "async page => { ... }"`. Prefer built-in commands when they suffice — run-code adds token cost and complexity.
- **Failure escalation: (1)** re-snapshot → retry with new ref. **(2)** Check `console` and `network` for JS errors or failed API calls. **(3)** Switch to role/chained selectors: `"role=button[name=Submit]"` or `"#section >> role=button[name=X]"`. **(4)** Use `run-code` for complex waits or frame issues. **(5)** Start tracing: `tracing-start` for post-mortem.

6. Find video: `basename $(ls -t .playwright-mcp/*.webm 2>/dev/null | head -1)`
7. Write summary.json and steps.json following schema. Video auto-saves to `.playwright-mcp/` — store basename only, do NOT copy/move/delete or take screenshots.
8. Verify browser closed and all output files created.

**Network monitoring** (during exploration): After navigating to each page, run `playwright-cli network` to list all captured HTTP requests. Look for XHR/fetch API calls (e.g., GET /api/products). Filter out static assets (CSS, JS, images). Report all discovered API endpoints in your findings with HTTP method and URL path.

**Output**: ISO 8601 timestamps, PASS/FAIL/SKIP outcomes, relative paths, no screenshots, no git operations.

**Environment issues** (not product bugs): PDF downloads in headless, broken signed URLs in staging, popups to invalid URLs.

For ambiguous steps, decide intelligently and document your interpretation.
