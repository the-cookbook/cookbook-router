import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const requiredFiles = [
  'README.md',
  'CHANGELOG.md',
  'LICENSE',
  'SECURITY.md',
  'CONTRIBUTING.md',
  '.github/workflows/ci.yml',
  '.github/workflows/release.yml',
  '.github/workflows/version.yml',
  'docs/getting-started.md',
  'docs/routing.md',
  'docs/navigation.md',
  'docs/search-and-hash.md',
  'docs/ssr.md',
  'docs/middleware.md',
  'docs/lifecycle.md',
  'docs/testing.md',
  'docs/codegen.md',
  'docs/contracts.md',
  'docs/react-integration.md',
];
const packageDirectories = [
  'packages/router',
  'packages/router-react',
  'packages/router-cli',
  'packages/router-vite-plugin',
  'packages/router-webpack-plugin',
  'packages/router-rspack-plugin',
  'packages/router-rollup-plugin',
  'packages/router-esbuild-plugin',
  'packages/router-bun-plugin',
];
const failures = [];

for (const file of requiredFiles) {
  try {
    await readFile(join(root, file), 'utf8');
  } catch {
    failures.push(`${file} is required for the release candidate.`);
  }
}

for (const directory of packageDirectories) {
  const packageJson = JSON.parse(await readFile(join(root, directory, 'package.json'), 'utf8'));

  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(packageJson.version)) {
    failures.push(`${packageJson.name} must use a valid semver version.`);
  }

  if (
    !packageJson.exports?.['.']?.types ||
    !packageJson.exports?.['.']?.import ||
    !packageJson.exports?.['.']?.require
  ) {
    failures.push(`${packageJson.name} must expose types, ESM, and CJS entrypoints.`);
  }

  if (packageJson.sideEffects !== false) {
    failures.push(`${packageJson.name} must keep sideEffects: false.`);
  }
}

run('node', ['./scripts/validate-package-exports.mjs']);
run('node', ['./scripts/validate-publish-config.mjs']);
run('node', ['./scripts/validate-no-release-blockers.mjs']);
run('node', ['./scripts/validate-docs-api.mjs']);

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    failures.push(`${command} ${args.join(' ')} failed.`);
  }
}
