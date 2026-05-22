#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

const root = process.argv[2] ? resolve(process.argv[2]) : process.cwd();
const forbiddenGenericPatterns = [
  /Task tool/i,
  /subagent_type/i,
  /\{\{INVOKE_[A-Z_]+\}\}/,
  /test-case-manager/i,
  /use the Task tool/i,
];
const genericRoots = [
  'skills/qa/',
  'skills/onboarding/',
  'skills/communication/',
  'skills/events/',
];

const failures = [];

function fail(message) {
  failures.push(message);
}

async function readJson(rel) {
  return JSON.parse(await readFile(join(root, rel), 'utf8'));
}

async function walk(dir) {
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir);
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    const s = await stat(full);
    if (s.isDirectory()) files.push(...await walk(full));
    else files.push(full);
  }
  return files;
}

function parseFrontmatter(content, rel) {
  if (!content.startsWith('---\n')) {
    fail(`${rel}: missing frontmatter fence`);
    return {};
  }
  const end = content.indexOf('\n---\n', 4);
  if (end === -1) {
    fail(`${rel}: missing closing frontmatter fence`);
    return {};
  }
  const frontmatter = content.slice(4, end).trim();
  const data = {};
  for (const line of frontmatter.split('\n')) {
    if (!line.trim()) continue;
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) {
      fail(`${rel}: invalid frontmatter line: ${line}`);
      continue;
    }
    data[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
  return data;
}

function skillDirExists(path) {
  return existsSync(join(root, path, 'SKILL.md')) || existsSync(join(root, path, 'SKILL.md'.toLowerCase()));
}

function validateManifest(pkg) {
  if (!pkg.keywords?.includes('pi-package')) {
    fail('package.json: keywords must include pi-package');
  }
  if (!Array.isArray(pkg.pi?.skills) || !pkg.pi.skills.includes('./skills')) {
    fail('package.json: pi.skills must include ./skills');
  }
}

function validateTaskCoverage(inventory, map) {
  const mapped = new Set(map.taskMappings.map((entry) => entry.slug));
  for (const task of inventory.tasks) {
    if (!mapped.has(task.slug)) fail(`conversion-map.json: missing task slug mapping for ${task.slug}`);
  }
  for (const alias of inventory.aliases ?? []) {
    if (!mapped.has(alias.alias)) fail(`conversion-map.json: missing task alias mapping for ${alias.alias}`);
    const entry = map.taskMappings.find((m) => m.slug === alias.alias);
    if (entry?.aliasOf !== alias.canonicalSlug) {
      fail(`conversion-map.json: alias ${alias.alias} must point at ${alias.canonicalSlug}`);
    }
  }
  for (const entry of map.taskMappings) {
    for (const path of entry.skillPaths ?? []) {
      if (!skillDirExists(path)) fail(`conversion-map.json: mapped task path missing SKILL.md: ${path}`);
    }
  }
}

function validateSubagentCoverage(inventory, map) {
  const mapped = new Set(map.subagentMappings.map((entry) => `${entry.role}:${entry.integration}`));
  for (const role of inventory.roles) {
    for (const integration of role.integrations) {
      const key = `${role.role}:${integration.id}`;
      if (!mapped.has(key)) fail(`conversion-map.json: missing subagent mapping for ${key}`);
    }
  }
  for (const entry of map.subagentMappings) {
    for (const path of entry.skillPaths ?? []) {
      if (!skillDirExists(path)) fail(`conversion-map.json: mapped subagent path missing SKILL.md: ${path}`);
    }
  }
}

function validateSkill(rel, content, seenNames) {
  const frontmatter = parseFrontmatter(content, rel);
  const name = frontmatter.name;
  const description = frontmatter.description;
  if (!name) fail(`${rel}: missing name`);
  if (!description) fail(`${rel}: missing description`);
  if (name && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) fail(`${rel}: invalid kebab-case name ${name}`);
  if (name && name.length > 64) fail(`${rel}: name exceeds 64 chars`);
  if (description && description.length > 1024) fail(`${rel}: description exceeds 1024 chars`);
  if (name) {
    if (seenNames.has(name)) fail(`${rel}: duplicate skill name ${name}; first seen at ${seenNames.get(name)}`);
    else seenNames.set(name, rel);
  }

  if (genericRoots.some((prefix) => rel.startsWith(prefix))) {
    for (const pattern of forbiddenGenericPatterns) {
      if (pattern.test(content)) fail(`${rel}: generic skill contains forbidden legacy dispatch wording (${pattern})`);
    }
  }

  if (!/^## When to use$/m.test(content)) {
    fail(`${rel}: missing "## When to use" section`);
  }
}

async function main() {
  validateManifest(await readJson('package.json'));
  const conversionMap = await readJson('conversion-map.json');
  validateTaskCoverage(await readJson('source-inventory/task-slugs.json'), conversionMap);
  validateSubagentCoverage(await readJson('source-inventory/subagents.json'), conversionMap);

  const skillFiles = (await walk(join(root, 'skills')))
    .filter((file) => file.endsWith('/SKILL.md') || file.endsWith('\\SKILL.md'));
  if (skillFiles.length === 0) fail('skills/: no SKILL.md files found');

  const seenNames = new Map();
  for (const file of skillFiles) {
    const rel = relative(root, file).replace(/\\/g, '/');
    validateSkill(rel, await readFile(file, 'utf8'), seenNames);
  }

  if (failures.length > 0) {
    console.error(`Skill validation failed with ${failures.length} issue(s):`);
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(`Validated ${skillFiles.length} skills.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
