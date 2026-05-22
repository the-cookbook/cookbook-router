import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const packageDirectories = ['packages/router', 'packages/router-react', 'packages/router-cli'];
const failures = [];

for (const packageDirectory of packageDirectories) {
  const result = spawnSync(
    'npm',
    ['publish', '--dry-run', '--access', 'public', '--provenance=false'],
    {
      cwd: join(root, packageDirectory),
      stdio: 'inherit',
      env: {
        ...process.env,
        CI: process.env.CI ?? 'true',
      },
    },
  );

  if (result.status !== 0) {
    failures.push(`npm publish --dry-run failed in ${packageDirectory}.`);
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
