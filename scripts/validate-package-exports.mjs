import { access, readFile } from 'node:fs/promises';
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

  for (const [exportName, exportValue] of Object.entries(packageJson.exports ?? {})) {
    if (exportName === './package.json') {
      continue;
    }

    if (!exportValue || typeof exportValue !== 'object') {
      failures.push(
        `${packageJson.name} exports["${exportName}"] must be a conditional export object.`,
      );
      continue;
    }

    for (const field of requiredExportFields) {
      if (!exportValue[field]) {
        failures.push(`${packageJson.name} exports["${exportName}"].${field} is missing.`);
      }
    }

    if (requiredExportFields.every((field) => typeof exportValue[field] === 'string')) {
      const importTarget = exportValue.import;
      const expectedRequire = importTarget.replace(/\.js$/, '.cjs');
      const expectedTypes = importTarget.replace(/\.js$/, '.d.ts');

      if (exportValue.require !== expectedRequire) {
        failures.push(
          `${packageJson.name} exports["${exportName}"].require must be ${expectedRequire}.`,
        );
      }

      if (exportValue.types !== expectedTypes) {
        failures.push(
          `${packageJson.name} exports["${exportName}"].types must be ${expectedTypes}.`,
        );
      }

      const sourceBase = importTarget.replace(/^\.\/dist\//, 'src/').replace(/\.js$/, '');
      const hasSource = await sourceExists(packageDir, sourceBase);

      if (!hasSource) {
        failures.push(
          `${packageJson.name} exports["${exportName}"] has no ` +
            `${sourceBase}.ts or ${sourceBase}.tsx source entry.`,
        );
      }
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

async function sourceExists(packageDir, sourceBase) {
  for (const extension of ['.ts', '.tsx']) {
    try {
      await access(join(packageDir, `${sourceBase}${extension}`));
      return true;
    } catch {
      // Try the next supported TypeScript source extension.
    }
  }

  return false;
}
