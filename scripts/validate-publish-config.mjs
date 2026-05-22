import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const packages = ['router', 'router-react', 'router-cli'];
const failures = [];

for (const packageName of packages) {
  const packageJson = JSON.parse(
    await readFile(join('packages', packageName, 'package.json'), 'utf8'),
  );

  if (packageJson.private) {
    failures.push(`${packageJson.name} must not be private.`);
  }

  if (packageJson.license !== 'MIT') {
    failures.push(`${packageJson.name} must declare the MIT license.`);
  }

  if (packageJson.publishConfig?.access !== 'public') {
    failures.push(`${packageJson.name} must publish with public access.`);
  }

  if (packageJson.publishConfig?.provenance !== true) {
    failures.push(`${packageJson.name} must enable npm provenance.`);
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
    const expectedBin = { cbr: './dist/index.js', 'cookbook-router': './dist/index.js' };

    if (JSON.stringify(packageJson.bin) !== JSON.stringify(expectedBin)) {
      failures.push('@cookbook/router-cli must publish cookbook-router and cbr binaries.');
    }
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
