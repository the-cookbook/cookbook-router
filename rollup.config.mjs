import { existsSync } from 'node:fs';
import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';

const packageRoot = process.cwd();
const packageJson = await import(`${packageRoot}/package.json`, { with: { type: 'json' } });
const external = [
  ...Object.keys(packageJson.default.dependencies ?? {}),
  ...Object.keys(packageJson.default.peerDependencies ?? {}),
];

const isExternal = (id) =>
  external.some((dependency) => id === dependency || id.startsWith(`${dependency}/`));
const buildTsconfig = existsSync(`${packageRoot}/tsconfig.build.json`)
  ? './tsconfig.build.json'
  : './tsconfig.json';

export default [
  {
    input: 'src/index.ts',
    external: isExternal,
    plugins: [
      nodeResolve({ extensions: ['.mjs', '.js', '.json', '.node', '.ts', '.tsx'] }),
      commonjs(),
      typescript({
        tsconfig: buildTsconfig,
        declaration: true,
        declarationDir: 'dist',
        rootDir: 'src',
      }),
    ],
    output: [
      { file: 'dist/index.js', format: 'esm', sourcemap: true },
      { file: 'dist/index.cjs', format: 'cjs', sourcemap: true, exports: 'named' },
    ],
    treeshake: { moduleSideEffects: false },
  },
  {
    input: 'dist/index.d.ts',
    external: isExternal,
    plugins: [dts()],
    output: [{ file: 'dist/index.d.ts', format: 'esm' }],
  },
];
