import { existsSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { builtinModules } from 'node:module';
import { join } from 'node:path';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import { dts } from 'rollup-plugin-dts';

const packageRoot = process.cwd();
const distDir = join(packageRoot, 'dist');
const temporaryTypesDir = join(distDir, '.types');

await rm(distDir, {
  recursive: true,
  force: true,
});

const packageJson = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'));

const externalDependencies = [
  ...Object.keys(packageJson.dependencies ?? {}),
  ...Object.keys(packageJson.peerDependencies ?? {}),
  ...Object.keys(packageJson.optionalDependencies ?? {}),
];

const nodeBuiltins = new Set([
  ...builtinModules,
  ...builtinModules.map((moduleName) => `node:${moduleName}`),
]);

const isExternal = (id) =>
  nodeBuiltins.has(id) ||
  externalDependencies.some((dependency) => id === dependency || id.startsWith(`${dependency}/`));

const buildTsconfig = existsSync(join(packageRoot, 'tsconfig.build.json'))
  ? './tsconfig.build.json'
  : './tsconfig.json';

const runtimeEntries = getRuntimeEntries(packageJson.exports, packageJson.bin);

const declarationEntries = getDeclarationEntries(packageJson.exports);

export default [
  {
    input: runtimeEntries,
    external: isExternal,
    preserveEntrySignatures: 'exports-only',
    plugins: [
      nodeResolve({
        extensions: ['.mjs', '.js', '.ts', '.tsx'],
      }),
      typescript({
        tsconfig: buildTsconfig,
        declaration: true,
        declarationDir: 'dist/.types',
        declarationMap: false,
        sourceMap: false,
        rootDir: 'src',
      }),
      terser({
        ecma: 2022,
        module: true,
        compress: {
          passes: 2,
        },
        mangle: true,
        format: {
          comments: false,
        },
      }),
    ],
    output: [
      {
        dir: 'dist',
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        format: 'esm',
        sourcemap: false,
        compact: true,
        generatedCode: 'es2015',
        minifyInternalExports: true,
        hoistTransitiveImports: false,
      },
      {
        dir: 'dist',
        entryFileNames: '[name].cjs',
        chunkFileNames: 'chunks/[name]-[hash].cjs',
        format: 'cjs',
        sourcemap: false,
        exports: 'named',
        compact: true,
        generatedCode: 'es2015',
        minifyInternalExports: true,
        hoistTransitiveImports: false,
      },
    ],
    treeshake: {
      moduleSideEffects: false,
    },
  },
  {
    input: declarationEntries,
    external: isExternal,
    plugins: [
      dts({
        tsconfig: buildTsconfig,
      }),
      removeTemporaryTypes(),
    ],
    output: {
      dir: 'dist',
      entryFileNames: '[name].d.ts',
      format: 'esm',
    },
  },
];

function getRuntimeEntries(packageExports, packageBin) {
  const entries = {};

  for (const value of Object.values(packageExports ?? {})) {
    if (!value || typeof value !== 'object') {
      continue;
    }

    const name = getDistEntryName(value.import, '.js');

    if (name) {
      entries[name] = getSourceEntry(name);
    }
  }

  const binPaths = typeof packageBin === 'string' ? [packageBin] : Object.values(packageBin ?? {});

  for (const binPath of binPaths) {
    const name = getDistEntryName(binPath, '.js');

    if (name) {
      entries[name] = getSourceEntry(name);
    }
  }

  return entries;
}

function getDeclarationEntries(packageExports) {
  const entries = {};

  for (const value of Object.values(packageExports ?? {})) {
    if (!value || typeof value !== 'object') {
      continue;
    }

    const name = getDistEntryName(value.types, '.d.ts');

    if (name) {
      entries[name] = `dist/.types/${name}.d.ts`;
    }
  }

  return entries;
}

function getSourceEntry(name) {
  const tsEntry = join(packageRoot, 'src', `${name}.ts`);

  if (existsSync(tsEntry)) {
    return `src/${name}.ts`;
  }

  const tsxEntry = join(packageRoot, 'src', `${name}.tsx`);

  if (existsSync(tsxEntry)) {
    return `src/${name}.tsx`;
  }

  throw new Error(`Unable to find source entry for "${name}".`);
}

function getDistEntryName(path, extension) {
  if (typeof path !== 'string' || !path.startsWith('./dist/') || !path.endsWith(extension)) {
    return undefined;
  }

  return path.slice('./dist/'.length, -extension.length);
}

function removeTemporaryTypes() {
  return {
    name: 'remove-temporary-types',

    async closeBundle() {
      await rm(temporaryTypesDir, {
        recursive: true,
        force: true,
      });
    },
  };
}
