import { mkdtemp, mkdir, cp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const repoRoot = new URL('..', import.meta.url).pathname;
const validator = join(repoRoot, 'scripts/validate-skills.mjs');
const temps = [];

async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), 'bugzy-skills-validator-'));
  temps.push(dir);
  for (const rel of ['package.json', 'conversion-map.json', 'source-inventory']) {
    await cp(join(repoRoot, rel), join(dir, rel), { recursive: true });
  }
  await mkdir(join(dir, 'skills/qa/run-tests'), { recursive: true });
  await writeSkill(dir, 'skills/qa/run-tests', 'bugzy-run-tests');
  await mkdir(join(dir, 'skills/onboarding/onboard-testing'), { recursive: true });
  await writeSkill(dir, 'skills/onboarding/onboard-testing', 'bugzy-onboard-testing');
  for (const path of await mappedSkillPaths(dir)) {
    await mkdir(join(dir, path), { recursive: true });
    if (!await exists(join(dir, path, 'SKILL.md'))) {
      await writeSkill(dir, path, `fixture-${path.replace(/\/$/, '').replace(/[^a-z0-9]+/g, '-')}`.slice(0, 64).replace(/-$/, ''));
    }
  }
  return dir;
}

async function mappedSkillPaths(dir) {
  const map = JSON.parse(await readFile(join(dir, 'conversion-map.json'), 'utf8'));
  return [...map.taskMappings, ...map.subagentMappings].flatMap((entry) => entry.skillPaths ?? []);
}

async function exists(path) {
  try {
    await readFile(path);
    return true;
  } catch {
    return false;
  }
}

async function writeSkill(dir, relPath, name, extra = '') {
  await writeFile(join(dir, relPath, 'SKILL.md'), `---
name: ${name}
description: Fixture skill ${name} that is valid for validator regression tests.
---

# ${name}

## When to use

Use in validator tests.

## Workflow

1. Validate the fixture.
${extra}`);
}

function run(dir) {
  return spawnSync(process.execPath, [validator, dir], { encoding: 'utf8' });
}

afterEach(async () => {
  await Promise.all(temps.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

test('accepts a complete fixture', async () => {
  const dir = await fixture();
  const result = run(dir);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Validated \d+ skills\./);
});

test('fails missing frontmatter', async () => {
  const dir = await fixture();
  await writeFile(join(dir, 'skills/qa/run-tests/SKILL.md'), '# Missing frontmatter\n');
  const result = run(dir);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /missing frontmatter fence/);
});

test('fails duplicate skill names', async () => {
  const dir = await fixture();
  await writeSkill(dir, 'skills/qa/run-tests', 'duplicate-name');
  await writeSkill(dir, 'skills/onboarding/onboard-testing', 'duplicate-name');
  const result = run(dir);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /duplicate skill name duplicate-name/);
});

test('fails missing task conversion-map entries', async () => {
  const dir = await fixture();
  const mapPath = join(dir, 'conversion-map.json');
  const map = JSON.parse(await readFile(mapPath, 'utf8'));
  map.taskMappings = map.taskMappings.filter((entry) => entry.slug !== 'run-tests');
  await writeFile(mapPath, JSON.stringify(map, null, 2));
  const result = run(dir);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /missing task slug mapping for run-tests/);
});

test('fails missing subagent conversion-map entries', async () => {
  const dir = await fixture();
  const mapPath = join(dir, 'conversion-map.json');
  const map = JSON.parse(await readFile(mapPath, 'utf8'));
  map.subagentMappings = map.subagentMappings.filter((entry) => !(entry.role === 'source-control' && entry.integration === 'github'));
  await writeFile(mapPath, JSON.stringify(map, null, 2));
  const result = run(dir);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /missing subagent mapping for source-control:github/);
});

test('fails forbidden legacy dispatch wording in generic skills', async () => {
  const dir = await fixture();
  await writeSkill(dir, 'skills/qa/run-tests', 'bugzy-run-tests', '\nUse the Task tool with subagent_type to continue.\n');
  const result = run(dir);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /forbidden legacy dispatch wording/);
});
