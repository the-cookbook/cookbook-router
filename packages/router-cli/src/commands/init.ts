import { dirname, join, normalize } from 'node:path';
import type { CliFileSystem, CommandResult } from '../contracts';
import { nodeFileSystem } from '../fs/node-file-system';
import { loadRouterConfig } from '../config/load-router-config';
import { generateCommand } from './generate';
import { formatCommandError } from './format-command-error';

const defaultFs: CliFileSystem = nodeFileSystem;
const DEFAULT_SOURCE_DIR = 'src';
const DEFAULT_OUT_DIR = '.cookbook-router';
const DEFAULT_CONFIG_FILE = 'cookbook-router.config.ts';
const ROUTE_FILE_EXTENSIONS = 'ts,tsx,js,jsx,mts,cts,mjs,cjs';

export interface InitOptions {
  readonly cwd?: string;
  readonly fs?: CliFileSystem;
  readonly routeFiles?: string | readonly string[];
  readonly outDir?: string;
  readonly configFile?: string;
  readonly starterRouteFile?: string;
  readonly skipGenerate?: boolean;
  readonly verbose?: boolean;
}

/** Bootstraps cookbook-router config, starter route, scripts, and generated artifacts. */
export async function initCommand(options: InitOptions = {}): Promise<CommandResult> {
  try {
    const fs = options.fs ?? defaultFs;
    const cwd = options.cwd ?? '.';
    const sourceDir = await inferSourceDirectory(cwd, fs);
    const hasCustomRouteFiles = options.routeFiles !== undefined;
    const routeFiles = options.routeFiles ?? `${sourceDir}/**/*.route.{${ROUTE_FILE_EXTENSIONS}}`;
    const outDir = options.outDir ?? DEFAULT_OUT_DIR;
    const starterRouteFile = resolveStarterRouteFile({
      cwd,
      sourceDir,
      customRouteFiles: hasCustomRouteFiles,
      starterRouteFile: options.starterRouteFile,
    });
    const configFile = scopePath(options.configFile ?? DEFAULT_CONFIG_FILE, cwd);
    const packageJsonPath = scopePath('package.json', cwd);
    const tsconfigPath = scopePath('tsconfig.json', cwd);
    const writtenFiles: string[] = [];

    const existingConfig = options.configFile
      ? await loadRouterConfig({ configFile, cwd, fs, optional: true })
      : await loadRouterConfig({ cwd, fs, optional: true });

    if (existingConfig) {
      throw new Error(
        `Refusing to overwrite existing router config "${existingConfig.configFile}".`,
      );
    }

    await fs.mkdir(dirname(configFile), { recursive: true });
    await fs.writeFile(configFile, renderConfig(routeFiles, outDir));
    writtenFiles.push(configFile);

    if (starterRouteFile !== undefined && !(await fileExists(starterRouteFile, fs))) {
      await fs.mkdir(dirname(starterRouteFile), { recursive: true });
      await fs.writeFile(starterRouteFile, renderStarterRoute());
      writtenFiles.push(starterRouteFile);
    }

    if (await fileExists(packageJsonPath, fs)) {
      const packageJson = await updatePackageJsonScripts(
        packageJsonPath,
        fs,
        options.configFile ?? DEFAULT_CONFIG_FILE,
      );
      if (packageJson !== undefined) {
        writtenFiles.push(packageJsonPath);
      }
    }

    if (await fileExists(tsconfigPath, fs)) {
      const tsconfig = await updateTsconfigInclude(tsconfigPath, fs, [
        ...inferTsconfigIncludes(routeFiles),
        outDir,
      ]);
      if (tsconfig !== undefined) {
        writtenFiles.push(tsconfigPath);
      }
    }

    await fs.mkdir(scopePath(outDir, cwd), { recursive: true });

    if (options.skipGenerate !== true) {
      const generated = await generateCommand({ configFile, fs });

      if (!generated.ok) {
        if (hasCustomRouteFiles && isNoRouteFilesMatchedResult(generated)) {
          return { ok: true, files: writtenFiles, errors: [] };
        }

        return { ok: false, files: writtenFiles, errors: generated.errors };
      }

      writtenFiles.push(...generated.files);
    }

    return { ok: true, files: writtenFiles, errors: [] };
  } catch (error) {
    return {
      ok: false,
      files: [],
      errors: [formatCommandError(error, options.verbose)],
    };
  }
}

function resolveStarterRouteFile(options: {
  readonly cwd: string;
  readonly sourceDir: string;
  readonly customRouteFiles: boolean;
  readonly starterRouteFile: string | undefined;
}): string | undefined {
  if (options.starterRouteFile !== undefined) {
    return scopePath(options.starterRouteFile, options.cwd);
  }

  if (options.customRouteFiles) {
    return undefined;
  }

  return scopePath(`${options.sourceDir}/root.route.tsx`, options.cwd);
}

function isNoRouteFilesMatchedResult(result: CommandResult): boolean {
  return result.errors.some((error) =>
    error.startsWith('No route files matched routeFiles pattern'),
  );
}

async function inferSourceDirectory(cwd: string, fs: CliFileSystem): Promise<string> {
  for (const candidate of ['app', 'src']) {
    if (await directoryExists(scopePath(candidate, cwd), fs)) {
      return candidate;
    }
  }

  const packageJsonPath = scopePath('package.json', cwd);

  if (await fileExists(packageJsonPath, fs)) {
    const packageJson = await readPackageJson(packageJsonPath, fs);
    const scripts = packageJson?.scripts;
    const scriptText = scripts ? Object.values(scripts).join(' ') : '';

    if (
      /\b(?:vite|next|remix|react-router)\b/.test(scriptText) &&
      (await fileExists(scopePath('app.tsx', cwd), fs))
    ) {
      return 'app';
    }
  }

  return DEFAULT_SOURCE_DIR;
}

async function directoryExists(path: string, fs: CliFileSystem): Promise<boolean> {
  try {
    const stat = await fs.stat?.(path);

    if (stat?.isDirectory?.()) {
      return true;
    }

    if (stat?.isFile?.()) {
      return false;
    }

    if (fs.readdir) {
      await fs.readdir(path);
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

async function readPackageJson(
  packageJsonPath: string,
  fs: CliFileSystem,
): Promise<{ readonly scripts?: Record<string, string> } | undefined> {
  try {
    return JSON.parse(await fs.readFile(packageJsonPath)) as {
      readonly scripts?: Record<string, string>;
    };
  } catch {
    return undefined;
  }
}

function renderConfig(routeFiles: string | readonly string[], outDir: string): string {
  return [
    "import { defineRouterConfig } from '@cookbook/router-cli';",
    '',
    'export default defineRouterConfig({',
    `  routeFiles: ${JSON.stringify(routeFiles)},`,
    `  outDir: ${JSON.stringify(outDir)},`,
    '} as const);',
    '',
  ].join('\n');
}

function renderStarterRoute(): string {
  return [
    "import { defineRoute } from '@cookbook/router';",
    '',
    'export const rootRoute = defineRoute({',
    "  id: 'root',",
    "  path: '/',",
    '} as const);',
    '',
  ].join('\n');
}

function inferTsconfigIncludes(routeFiles: string | readonly string[]): readonly string[] {
  const entries = Array.isArray(routeFiles) ? routeFiles : [routeFiles];
  const includes: string[] = [];

  for (const entry of entries) {
    const include = inferTsconfigInclude(entry);

    if (!include || includes.includes(include)) {
      continue;
    }

    includes.push(include);
  }

  return includes;
}

function inferTsconfigInclude(routeFile: string): string | undefined {
  const normalized = normalize(routeFile).replace(/\\/g, '/');
  const wildcardIndex = normalized.indexOf('*');

  if (wildcardIndex !== -1) {
    const prefix = normalized.slice(0, wildcardIndex);
    const slashIndex = prefix.lastIndexOf('/');
    const root = slashIndex === -1 ? prefix : prefix.slice(0, slashIndex);
    const cleaned = root.replace(/\/$/, '');

    return cleaned || undefined;
  }

  const directory = dirname(normalized).replace(/\\/g, '/');

  if (directory === '.' || !directory) {
    return normalized;
  }

  return directory;
}

async function updatePackageJsonScripts(
  packageJsonPath: string,
  fs: CliFileSystem,
  configFile: string,
): Promise<string | undefined> {
  const contents = await fs.readFile(packageJsonPath);
  const packageJson = JSON.parse(contents) as {
    scripts?: Record<string, string>;
    [key: string]: unknown;
  };
  const scripts = packageJson.scripts ?? {};
  let changed = false;

  const configOption = configFile === DEFAULT_CONFIG_FILE ? '' : ` --config ${configFile}`;

  for (const [name, command] of Object.entries({
    'routes:generate': `cbr generate${configOption}`,
    'routes:watch': `cbr generate${configOption} --watch`,
    'routes:validate': `cbr validate${configOption}`,
  })) {
    if (scripts[name] !== undefined) {
      continue;
    }

    scripts[name] = command;
    changed = true;
  }

  if (!changed) {
    return undefined;
  }

  packageJson.scripts = scripts;
  await fs.writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
  return packageJsonPath;
}

async function updateTsconfigInclude(
  tsconfigPath: string,
  fs: CliFileSystem,
  requiredIncludes: readonly string[],
): Promise<string | undefined> {
  const contents = await fs.readFile(tsconfigPath);
  const tsconfig = JSON.parse(contents) as {
    include?: unknown;
    [key: string]: unknown;
  };
  const include = Array.isArray(tsconfig.include)
    ? tsconfig.include.filter((entry): entry is string => typeof entry === 'string')
    : [];
  let changed = false;

  for (const required of requiredIncludes) {
    if (include.includes(required)) {
      continue;
    }

    include.push(required);
    changed = true;
  }

  if (!changed && Array.isArray(tsconfig.include)) {
    return undefined;
  }

  tsconfig.include = include;
  await fs.writeFile(tsconfigPath, `${JSON.stringify(tsconfig, null, 2)}\n`);
  return tsconfigPath;
}

async function fileExists(path: string, fs: CliFileSystem): Promise<boolean> {
  try {
    await fs.readFile(path);
    return true;
  } catch {
    return false;
  }
}

function scopePath(path: string, cwd: string): string {
  if (cwd === '.' || isAbsoluteLike(path)) {
    return path;
  }

  return join(cwd, path);
}

function isAbsoluteLike(path: string): boolean {
  return path.startsWith('/') || /^[A-Za-z]:[\\/]/.test(path);
}
