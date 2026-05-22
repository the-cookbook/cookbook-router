import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const docsDirectories = ['docs'];
const packageIndexFiles = new Map([
  ['@cookbook/router', 'packages/router/src/index.ts'],
  ['@cookbook/router-react', 'packages/router-react/src/index.ts'],
  ['@cookbook/router-cli', 'packages/router-cli/src/index.ts'],
]);
const docsFiles = ['README.md', 'CONTRIBUTING.md', 'SECURITY.md', 'CHANGELOG.md'];
const failures = [];
const exportedNamesByPackage = new Map();

for (const [packageName, indexFile] of packageIndexFiles) {
  exportedNamesByPackage.set(
    packageName,
    collectExports(await readFile(join(root, indexFile), 'utf8')),
  );
}

for (const directory of docsDirectories) {
  for await (const file of walk(join(root, directory))) {
    if (file.endsWith('.md')) {
      docsFiles.push(relative(root, file));
    }
  }
}

for (const file of docsFiles) {
  const fullPath = join(root, file);
  const content = await readFile(fullPath, 'utf8');
  const imports = collectPackageImports(content);

  for (const entry of imports) {
    const exportedNames = exportedNamesByPackage.get(entry.packageName);

    if (!exportedNames) {
      continue;
    }

    for (const importedName of entry.names) {
      if (!exportedNames.has(importedName)) {
        failures.push(`${file}: ${entry.packageName} does not export ${importedName}.`);
      }
    }
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

function collectExports(content) {
  const names = new Set();
  const exportBlockPattern = /export\s+(?:type\s+)?\{([\s\S]*?)\}\s+from\s+['"][^'"]+['"]/g;
  let match;

  while ((match = exportBlockPattern.exec(content))) {
    for (const rawName of match[1].split(',')) {
      const cleaned = rawName.trim();

      if (!cleaned) {
        continue;
      }

      const publicName = cleaned.includes(' as ') ? cleaned.split(/\s+as\s+/).at(-1) : cleaned;
      names.add(publicName.trim());
    }
  }

  const functionPattern = /export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/g;
  while ((match = functionPattern.exec(content))) {
    names.add(match[1]);
  }

  const constPattern = /export\s+const\s+([A-Za-z0-9_]+)/g;
  while ((match = constPattern.exec(content))) {
    names.add(match[1]);
  }

  return names;
}

function collectPackageImports(content) {
  const imports = [];
  const importPattern =
    /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+['"](@cookbook\/router(?:-react|-cli)?)['"]/g;
  let match;

  while ((match = importPattern.exec(content))) {
    const names = match[1]
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => (name.includes(' as ') ? name.split(/\s+as\s+/)[0].trim() : name));

    imports.push({ packageName: match[2], names });
  }

  return imports;
}

async function* walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      yield* walk(entryPath);
    } else if (entry.isFile()) {
      yield entryPath;
    }
  }
}
