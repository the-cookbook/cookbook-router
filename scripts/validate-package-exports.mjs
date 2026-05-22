import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const packages = ['router', 'router-react', 'router-cli'];
const requiredExportFields = ['types', 'import', 'require'];

const failures = [];

for (const packageName of packages) {
  const packageDir = join('packages', packageName);
  const packageJson = JSON.parse(await readFile(join(packageDir, 'package.json'), 'utf8'));
  const rootExport = packageJson.exports?.['.'];

  if (!rootExport) {
    failures.push(`${packageJson.name} must define exports["."].`);
    continue;
  }

  for (const field of requiredExportFields) {
    if (!rootExport[field]) {
      failures.push(`${packageJson.name} exports["."].${field} is missing.`);
    }
  }

  if (packageJson.main !== rootExport.require) {
    failures.push(`${packageJson.name} main must match the CommonJS export.`);
  }

  if (packageJson.module !== rootExport.import) {
    failures.push(`${packageJson.name} module must match the ESM export.`);
  }

  if (packageJson.types !== rootExport.types) {
    failures.push(`${packageJson.name} types must match the declaration export.`);
  }

  if (packageJson.sideEffects !== false) {
    failures.push(`${packageJson.name} must declare sideEffects: false for tree-shaking.`);
  }

  if (packageJson.exports?.['./package.json'] !== './package.json') {
    failures.push(`${packageJson.name} must export ./package.json for tooling.`);
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
