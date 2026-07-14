import { describe, expect, it } from 'vitest';
import {
  parseManualSteps,
  parseResultInputs,
  deserializeManualSteps,
  normalizeList,
  normalizeResource,
  planWebUrl,
  serializeManualSteps,
  suiteWebUrl,
  toAzureResult,
} from '../../src/commands/tcms-common';

describe('TCMS input contracts', () => {
  it('validates and serializes manual steps with XML escaping', () => {
    const steps = parseManualSteps(JSON.stringify([
      { action: 'Enter <admin> & "password"', expected: "User's home\nopens" },
    ]));

    const xml = serializeManualSteps(steps);

    expect(xml).toContain('id="2"');
    expect(xml).toContain('&lt;DIV&gt;Enter &lt;admin&gt; &amp; &quot;password&quot;&lt;/DIV&gt;');
    expect(xml).toContain('User&apos;s home&lt;br/&gt;opens');
    expect(xml).not.toContain('<admin>');
    expect(deserializeManualSteps(xml)).toEqual(steps);
  });

  it('adds a browser URL when Azure only supplies API or MTM links', () => {
    process.env.AZURE_DEVOPS_ORG_URL = 'https://dev.azure.com/example';
    process.env.AZURE_DEVOPS_PAT = 'pat';
    const resource = { id: 5, url: 'https://dev.azure.com/example/Demo/_apis/testplan/plans/5' };

    expect(normalizeResource(resource, planWebUrl('Demo Project', resource)).webUrl).toBe(
      'https://dev.azure.com/example/Demo%20Project/_testPlans/define?planId=5',
    );
  });

  it('compacts identities and raw Test Case fields', () => {
    process.env.AZURE_DEVOPS_ORG_URL = 'https://dev.azure.com/example';
    process.env.AZURE_DEVOPS_PAT = 'pat';
    const normalized = normalizeResource({
      id: 4,
      owner: { id: 'user-1', displayName: 'User', uniqueName: 'user@example.com', descriptor: 'msa.user' },
      workItem: {
        id: 5,
        workItemFields: [
          { 'System.State': 'Design' },
          { 'Microsoft.VSTS.TCM.Steps': serializeManualSteps([{ action: 'Open', expected: 'Visible' }]) },
        ],
      },
    });

    expect(normalized.owner).toEqual({ id: 'user-1', displayName: 'User' });
    expect((normalized.workItem as { workItemFields: unknown }).workItemFields).toEqual({
      state: 'Design',
      steps: [{ action: 'Open', expected: 'Visible' }],
    });
  });

  it('adds browser links to every suite in a tree', () => {
    process.env.AZURE_DEVOPS_ORG_URL = 'https://dev.azure.com/example';
    process.env.AZURE_DEVOPS_PAT = 'pat';
    const normalized = normalizeList(
      [{ id: 2, children: [{ id: 4 }] }],
      undefined,
      (suite) => suiteWebUrl('Demo', 1, suite),
    );

    expect(normalized.value[0].webUrl).toContain('suiteId=2');
    expect((normalized.value[0].children as Array<{ webUrl: string }>)[0].webUrl).toContain('suiteId=4');
  });

  it('rejects malformed or incomplete step JSON', () => {
    expect(() => parseManualSteps('{bad')).toThrow('--steps must be valid JSON');
    expect(() => parseManualSteps('[{"action":"Click"}]')).toThrow('requires an expected string');
  });

  it('maps result inputs to Azure result fields', () => {
    const [input] = parseResultInputs('[{"testPointId":17,"outcome":"Passed","durationMs":1200,"comment":"ok"}]', false);

    expect(toAzureResult(input)).toEqual({
      testPoint: { id: '17' },
      outcome: 'Passed',
      state: 'Completed',
      durationInMs: 1200,
      comment: 'ok',
    });
  });

  it('requires IDs for result updates and rejects unsupported outcomes', () => {
    expect(() => parseResultInputs('[{"outcome":"Passed"}]', true)).toThrow('requires a positive integer id');
    expect(() => parseResultInputs('[{"testPointId":0,"outcome":"Passed"}]', false)).toThrow('must be a positive integer');
    expect(() => parseResultInputs('[{"testPointId":1,"outcome":"Almost"}]', false)).toThrow('unsupported outcome');
  });
});
