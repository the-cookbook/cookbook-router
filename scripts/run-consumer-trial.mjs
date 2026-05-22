import { cp, mkdir, readFile, rm, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// CI command coverage: pnpm build:packages, pnpm pack, pnpm install, pnpm validate:trial
const root = fileURLToPath(new URL('..', import.meta.url));
const sourceApp = join(root, 'consumer-trial');
const tempRoot = join(root, '.tmp', 'consumer-trial-install');
const packDir = join(tempRoot, 'packs');
const appDir = join(tempRoot, 'app');

await rm(tempRoot, { recursive: true, force: true });
await mkdir(packDir, { recursive: true });
await cp(sourceApp, appDir, {
  recursive: true,
  filter: (path) => !path.includes('node_modules') && !path.includes('/dist/'),
});

run('pnpm', ['build:packages'], root);

const tarballs = new Map();
for (const packageName of ['router', 'router-react', 'router-cli']) {
  const packageDir = join(root, 'packages', packageName);
  run('pnpm', ['pack', '--pack-destination', packDir], packageDir);
}

for (const entry of await readdir(packDir)) {
  if (entry.endsWith('.tgz')) {
    if (entry.includes('router-react')) {
      tarballs.set('@cookbook/router-react', join(packDir, entry));
    } else if (entry.includes('router-cli')) {
      tarballs.set('@cookbook/router-cli', join(packDir, entry));
    } else if (entry.includes('router-')) {
      tarballs.set('@cookbook/router', join(packDir, entry));
    }
  }
}

const requiredPackages = ['@cookbook/router', '@cookbook/router-react', '@cookbook/router-cli'];
const missingPackages = requiredPackages.filter((packageName) => !tarballs.has(packageName));
if (missingPackages.length) {
  throw new Error(`Missing packed package tarballs: ${missingPackages.join(', ')}`);
}

const packageJsonPath = join(appDir, 'package.json');
const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
packageJson.dependencies ??= {};
packageJson.pnpm ??= {};
packageJson.pnpm.overrides ??= {};

for (const [name, tarball] of tarballs) {
  const tarballDependency = `file:${tarball}`;
  packageJson.dependencies[name] = tarballDependency;
  packageJson.pnpm.overrides[name] = tarballDependency;
}
await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

run('pnpm', ['install', '--frozen-lockfile=false', '--ignore-workspace'], appDir);
run('pnpm', ['validate:trial'], appDir);

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    env: {
      ...process.env,
      CI: process.env.CI ?? 'true',
    },
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed in ${cwd}`);
  }
}
