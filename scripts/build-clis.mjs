import { chmodSync, existsSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const integrationsDir = join(root, 'skills', 'integrations');

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const cliDirs = readdirSync(integrationsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => join(integrationsDir, entry.name, 'cli'))
  .filter((dir) => existsSync(join(dir, 'package.json')));

for (const dir of cliDirs) {
  const rel = relative(root, dir);
  console.log(`\n> Building ${rel}`);

  if (!existsSync(join(dir, 'node_modules'))) {
    run('npm', ['ci'], dir);
  }

  run('npm', ['run', 'build'], dir);

  const entrypoint = join(dir, 'dist', 'cli.js');
  if (!existsSync(entrypoint)) {
    console.error(`Missing built entrypoint: ${relative(root, entrypoint)}`);
    process.exit(1);
  }
  chmodSync(entrypoint, 0o755);
}
