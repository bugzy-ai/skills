# Azure DevOps Test Plans

Use the configured Azure DevOps connection for Test Plans. Azure is the source of truth. Never create a filesystem-backed test case as a fallback when Azure is configured and an Azure operation fails.

## Authentication and permissions

The environment supplies `AZURE_DEVOPS_ORG_URL` and `AZURE_DEVOPS_PAT` from the active team connection. Never print either value. Read operations require Azure Test Management read permission; writes require Test Management read/write plus access to the target project. A `403` is a permission blocker, not a reason to use local storage.

## Identity rules

Preserve every returned plan, suite, Test Case, test point, run, and result ID plus Azure URLs. Use IDs for all later updates and relationships.

Before creating an artifact:

1. List within the narrowest parent scope.
2. Reuse one exact match and retain its ID.
3. Create only when no exact match exists and the workflow is approved to mutate Azure.
4. Stop on multiple exact matches. Report the candidate IDs instead of guessing.
5. After an uncertain create response, list again before retrying. Never repeat a create blindly.

## Artifact commands

```bash
azure-devops-cli test-plan list --project "MyProject" --active-only true
azure-devops-cli test-plan get 5 --project "MyProject"
azure-devops-cli test-plan create --project "MyProject" --name "Release 42" --area-path "MyProject" --iteration "MyProject\\Sprint 42"
azure-devops-cli test-plan update 5 --project "MyProject" --state Active

azure-devops-cli test-suite list --project "MyProject" --plan-id 5 --tree true
azure-devops-cli test-suite get 12 --project "MyProject" --plan-id 5
azure-devops-cli test-suite create --project "MyProject" --plan-id 5 --parent-suite-id 6 --name "Login" --suite-type staticTestSuite
azure-devops-cli test-suite update 12 --project "MyProject" --plan-id 5 --name "Authentication"

azure-devops-cli test-case list --project "MyProject" --plan-id 5 --suite-id 12
azure-devops-cli test-case get 20 --project "MyProject"
azure-devops-cli test-case create --project "MyProject" --title "Valid user signs in" --steps '[{"action":"Open the login page","expected":"The login form is visible"},{"action":"Submit valid credentials","expected":"The account home page opens"}]'
azure-devops-cli test-case update 20 --project "MyProject" --steps '[{"action":"Submit valid credentials","expected":"The account home page opens"}]'

azure-devops-cli test-suite add-cases 12 --project "MyProject" --plan-id 5 --case-ids "20,21"
azure-devops-cli test-suite remove-cases 12 --project "MyProject" --plan-id 5 --case-ids "21"
```

`remove-cases` removes suite membership only. It does not delete the Test Case work item.

Keep inline JSON in single quotes. The CLI validates step arrays and converts them to Azure's `Microsoft.VSTS.TCM.Steps` XML. Do not generate or pass raw step XML.

## Execution commands

Adding a Test Case to a suite creates one or more test points. Resolve the point IDs before creating a run:

```bash
azure-devops-cli test-point list --project "MyProject" --plan-id 5 --suite-id 12 --case-id 20 --include-details true
azure-devops-cli test-run create --project "MyProject" --plan-id 5 --point-ids "17" --name "Login smoke 2026-07-13"
azure-devops-cli test-run get 33 --project "MyProject"
azure-devops-cli test-result list --project "MyProject" --run-id 33 --details Point
```

A point-based run can already contain result records. List results first and update the returned result ID when present:

```bash
azure-devops-cli test-result update 100001 --project "MyProject" --run-id 33 --outcome Passed --duration-ms 1200 --comment "Login completed successfully"
```

When Azure has no result record for the required point, add one with validated inline JSON:

```bash
azure-devops-cli test-result add --project "MyProject" --run-id 33 --results '[{"testPointId":17,"testCaseId":20,"outcome":"Failed","durationMs":900,"comment":"Dashboard did not load","errorMessage":"Expected account home page"}]'
```

Batch updates require each result ID:

```bash
azure-devops-cli test-result update --project "MyProject" --run-id 33 --results '[{"id":100001,"outcome":"Passed"},{"id":100002,"outcome":"Blocked","comment":"Test data unavailable"}]'
```

Complete and read back the run only after all intended results are recorded:

```bash
azure-devops-cli test-run complete 33 --project "MyProject" --comment "Manual smoke complete"
azure-devops-cli test-result list --project "MyProject" --run-id 33 --details Point
azure-devops-cli test-run get 33 --project "MyProject"
```

## Final evidence

Report the project plus all plan, suite, Test Case, point, run, and result IDs used. Include Azure API and web links returned by the CLI. State whether artifacts were discovered, created, or updated and whether the run was completed and read back.

## Guardrails

- Do not delete plans, suites, Test Cases, runs, or results.
- Do not upload screenshots, videos, traces, or other binary artifacts.
- Do not record per-step execution outcomes in this workflow.
- Do not mutate by title after an ID is known.
- Do not expose credentials in commands, output, logs, or files.
