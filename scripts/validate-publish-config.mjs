import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const packages = [
  'router',
  'router-react',
  'router-cli',
  'router-vite-plugin',
  'router-webpack-plugin',
  'router-rspack-plugin',
  'router-rollup-plugin',
  'router-esbuild-plugin',
  'router-bun-plugin',
];
const failures = [];

for (const packageName of packages) {
  const packageJson = JSON.parse(
    await readFile(join('packages', packageName, 'package.json'), 'utf8'),
  );

  if (packageJson.private) {
    failures.push(`${packageJson.name} must not be private.`);
  }

  if (packageJson.license !== 'Apache-2.0') {
    failures.push(`${packageJson.name} must declare the Apache-2.0 license.`);
  }

  if (packageJson.publishConfig?.access !== 'public') {
    failures.push(`${packageJson.name} must publish with public access.`);
  }

  if (!packageJson.repository?.url?.includes('the-cookbook/cookbook-router')) {
    failures.push(`${packageJson.name} must include repository metadata.`);
  }

  if (!packageJson.files?.includes('dist')) {
    failures.push(`${packageJson.name} must publish dist.`);
  }

  if (!packageJson.engines?.node) {
    failures.push(`${packageJson.name} must declare a Node engine.`);
  }

  if (packageJson.name === '@cookbook/router-cli') {
    const expectedBin = { cbr: './dist/bin.js', 'cookbook-router': './dist/bin.js' };

    if (JSON.stringify(packageJson.bin) !== JSON.stringify(expectedBin)) {
      failures.push('@cookbook/router-cli must publish cookbook-router and cbr binaries.');
    }
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
