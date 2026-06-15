import { join, resolve } from 'node:path';

export interface GeneratedOutputPaths {
  readonly outDir: string;
  readonly contractsPath: string;
  readonly manifestPath: string;
  readonly registerPath: string;
}

const GENERATED_ROUTES_FILENAME = 'routes.ts';
const GENERATED_FILENAMES = ['contracts.ts', 'manifest.json', 'register.d.ts'] as const;

export function resolveGeneratedOutputPaths(outDir = '.cookbook-router'): GeneratedOutputPaths {
  const safeOutDir = assertSafeCliPath('outDir', outDir);
  const outputRoot = resolve(safeOutDir);
  const contractsPath = join(safeOutDir, GENERATED_FILENAMES[0]);
  const manifestPath = join(safeOutDir, GENERATED_FILENAMES[1]);
  const registerPath = join(safeOutDir, GENERATED_FILENAMES[2]);

  assertOutputPathWithinRoot(outputRoot, contractsPath, GENERATED_FILENAMES[0]);
  assertOutputPathWithinRoot(outputRoot, manifestPath, GENERATED_FILENAMES[1]);
  assertOutputPathWithinRoot(outputRoot, registerPath, GENERATED_FILENAMES[2]);

  return {
    outDir: safeOutDir,
    contractsPath,
    manifestPath,
    registerPath,
  };
}

export function resolveGeneratedRoutesPath(output: GeneratedOutputPaths): string {
  const routesPath = join(output.outDir, GENERATED_ROUTES_FILENAME);
  assertOutputPathWithinRoot(resolve(output.outDir), routesPath, GENERATED_ROUTES_FILENAME);
  return routesPath;
}

export function assertSafeRouteFilePaths(routeFiles: readonly string[]): void {
  for (const routeFile of routeFiles) {
    assertSafeCliPath('routeFiles', routeFile);
  }
}

export function assertGeneratedOutputDoesNotClobberRouteFiles(
  output: GeneratedOutputPaths,
  routeFiles: readonly string[] = [],
): void {
  const generatedPaths = new Set([
    resolve(resolveGeneratedRoutesPath(output)),
    resolve(output.contractsPath),
    resolve(output.manifestPath),
    resolve(output.registerPath),
  ]);

  for (const routeFile of routeFiles) {
    const resolvedRouteFile = resolve(routeFile);

    if (generatedPaths.has(resolvedRouteFile)) {
      throw new Error(
        `Refusing to write generated router artifacts over route source file "${routeFile}".`,
      );
    }
  }
}

export function assertSafeCliPath(label: string, value: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`CLI ${label} must be a non-empty path string.`);
  }

  if (value.includes('\0')) {
    throw new Error(`CLI ${label} contains a null byte and cannot be used as a file path.`);
  }

  return value;
}

function assertOutputPathWithinRoot(
  outputRoot: string,
  outputPath: string,
  filename: string,
): void {
  const resolvedOutputPath = resolve(outputPath);

  if (resolvedOutputPath !== resolve(outputRoot, filename)) {
    throw new Error(`Refusing to write generated router artifact outside outDir: "${outputPath}".`);
  }
}
