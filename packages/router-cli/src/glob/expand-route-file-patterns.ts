import { dirname, join, relative, sep } from 'node:path';
import type { CliFileSystem } from '../contracts';
import { nodeFileSystem } from '../fs/node-file-system';
import { assertSafeRouteFilePaths } from '../security/safe-paths';

const defaultFs: CliFileSystem = nodeFileSystem;

const DEFAULT_EXCLUDED_DIRECTORIES = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.next',
  '.nuxt',
  '.svelte-kit',
  '.turbo',
  '.vite',
  '.cache',
] as const;

export interface ExpandRouteFilePatternsOptions {
  readonly patterns: string | readonly string[];
  readonly cwd?: string;
  readonly fs?: CliFileSystem;
  readonly excludeDirs?: readonly string[];
}

/** Expands CLI/config route file entries, including simple glob patterns. */
export async function expandRouteFilePatterns(
  options: ExpandRouteFilePatternsOptions,
): Promise<readonly string[]> {
  const fs = options.fs ?? defaultFs;
  const patterns = normalizePatterns(options.patterns);
  const files: string[] = [];
  const seen = new Set<string>();

  for (const pattern of patterns) {
    const scopedPattern = scopePattern(pattern, options.cwd);
    const expanded = hasGlobSyntax(scopedPattern)
      ? await expandGlob(scopedPattern, fs, [
          ...DEFAULT_EXCLUDED_DIRECTORIES,
          ...(options.excludeDirs ?? []),
        ])
      : [scopedPattern];

    for (const file of expanded) {
      if (seen.has(file)) {
        continue;
      }

      seen.add(file);
      files.push(file);
    }
  }

  assertSafeRouteFilePaths(files);
  return files;
}

export interface RouteFilePatternWatchPathsOptions {
  readonly patterns: string | readonly string[];
  readonly cwd?: string;
}

/** Returns stable file or directory paths that should be watched for route file patterns. */
export function getRouteFilePatternWatchPaths(
  options: RouteFilePatternWatchPathsOptions,
): readonly string[] {
  const patterns = normalizePatterns(options.patterns);
  const seen = new Set<string>();
  const paths: string[] = [];

  for (const pattern of patterns) {
    const scopedPattern = scopePattern(pattern, options.cwd);
    const watchPath = hasGlobSyntax(scopedPattern) ? getGlobRoot(scopedPattern) : scopedPattern;

    if (seen.has(watchPath)) {
      continue;
    }

    seen.add(watchPath);
    paths.push(watchPath);
  }

  assertSafeRouteFilePaths(paths);
  return paths;
}

function normalizePatterns(patterns: string | readonly string[]): readonly string[] {
  const normalized = typeof patterns === 'string' ? [patterns] : [...patterns];

  for (const pattern of normalized) {
    if (typeof pattern !== 'string' || !pattern.trim()) {
      throw new Error('routeFiles patterns must be non-empty strings.');
    }
  }

  assertSafeRouteFilePaths(normalized);
  return normalized;
}

function scopePattern(pattern: string, cwd: string | undefined): string {
  if (!cwd || cwd === '.' || isAbsoluteLike(pattern)) {
    return normalizePath(pattern);
  }

  return normalizePath(join(cwd, pattern));
}

async function expandGlob(
  pattern: string,
  fs: CliFileSystem,
  excludeDirs: readonly string[],
): Promise<readonly string[]> {
  if (!fs.readdir || !fs.stat) {
    throw new Error('Glob routeFiles require a file system with readdir and stat support.');
  }

  const root = getGlobRoot(pattern);
  const matcher = createGlobMatcher(pattern);
  const files: string[] = [];
  await walkFiles(root, fs, matcher, files, new Set(excludeDirs.map(normalizePath)));
  return files.sort();
}

async function walkFiles(
  directory: string,
  fs: CliFileSystem,
  matcher: (path: string) => boolean,
  files: string[],
  excludedDirs: ReadonlySet<string>,
): Promise<void> {
  let entries: readonly string[];

  try {
    entries = await fs.readdir!(directory);
  } catch {
    return;
  }

  for (const entry of entries ?? []) {
    const path = normalizePath(join(directory, entry));
    const normalizedEntry = normalizePath(entry);

    if (excludedDirs.has(path) || excludedDirs.has(normalizedEntry)) {
      continue;
    }

    let stat: Awaited<ReturnType<NonNullable<CliFileSystem['stat']>>>;

    try {
      stat = await fs.stat!(path);
    } catch {
      continue;
    }

    if (stat?.isDirectory?.()) {
      await walkFiles(path, fs, matcher, files, excludedDirs);
      continue;
    }

    if (stat?.isFile?.() !== false && matcher(path)) {
      files.push(path);
    }
  }
}

function getGlobRoot(pattern: string): string {
  const normalized = normalizePath(pattern);
  const firstGlobIndex = findFirstGlobIndex(normalized);

  if (firstGlobIndex < 0) {
    return dirname(normalized) || '.';
  }

  const slashIndex = normalized.lastIndexOf('/', firstGlobIndex);

  if (slashIndex < 0) {
    return '.';
  }

  const root = normalized.slice(0, slashIndex);
  return root || '/';
}

function findFirstGlobIndex(pattern: string): number {
  const indexes = ['*', '?', '{']
    .map((char) => pattern.indexOf(char))
    .filter((index) => index >= 0);
  return indexes[0] === undefined ? -1 : Math.min(...indexes);
}

function createGlobMatcher(pattern: string): (path: string) => boolean {
  const regex = new RegExp(`^${globToRegex(normalizePath(pattern))}$`);
  return (path) => regex.test(normalizePath(path));
}

function globToRegex(pattern: string): string {
  let output = '';
  let index = 0;

  while (index < pattern.length) {
    const char = pattern[index];

    if (char === '*') {
      if (pattern[index + 1] === '*') {
        const afterGlobstar = pattern[index + 2];

        if (afterGlobstar === '/') {
          output += '(?:.*/)?';
          index += 3;
          continue;
        }

        output += '.*';
        index += 2;
        continue;
      }

      output += '[^/]*';
      index += 1;
      continue;
    }

    if (char === '?') {
      output += '[^/]';
      index += 1;
      continue;
    }

    if (char === '{') {
      const closeIndex = pattern.indexOf('}', index + 1);

      if (closeIndex > index) {
        const alternatives = pattern
          .slice(index + 1, closeIndex)
          .split(',')
          .map((part) => escapeRegExp(part));
        output += `(?:${alternatives.join('|')})`;
        index = closeIndex + 1;
        continue;
      }
    }

    output += escapeRegExp(char ?? '');
    index += 1;
  }

  return output;
}

function hasGlobSyntax(path: string): boolean {
  return /[*?{]/.test(path);
}

function normalizePath(path: string): string {
  return path.split(sep).join('/').replace(/\/+/g, '/');
}

function isAbsoluteLike(path: string): boolean {
  return path.startsWith('/') || /^[A-Za-z]:[\\/]/.test(path);
}

function escapeRegExp(value: string): string {
  return value.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
}

export function toRelativeRoutePath(from: string, to: string): string {
  return normalizePath(relative(from, to));
}
