import { describe, expect, test } from 'vitest';
import {
  assertGeneratedOutputDoesNotClobberRouteFiles,
  assertSafeCliPath,
  assertSafeRouteFilePaths,
  resolveGeneratedOutputPaths,
} from './safe-paths';

describe('safe cli paths', () => {
  test('returns fixed generated artifact paths inside outDir', () => {
    expect(resolveGeneratedOutputPaths('.cookbook-router')).toEqual({
      outDir: '.cookbook-router',
      contractsPath: '.cookbook-router/contracts.ts',
      manifestPath: '.cookbook-router/manifest.json',
      registerPath: '.cookbook-router/register.d.ts',
    });
  });

  test('rejects empty and null-byte paths', () => {
    expect(() => assertSafeCliPath('outDir', '')).toThrow('non-empty path string');
    expect(() => assertSafeCliPath('outDir', 'safe\0unsafe')).toThrow('null byte');
    expect(() => assertSafeRouteFilePaths(['routes.json', 'bad\0routes.json'])).toThrow(
      'null byte',
    );
  });

  test('rejects generated writes that clobber source route files', () => {
    const output = resolveGeneratedOutputPaths('.cookbook-router');

    expect(() =>
      assertGeneratedOutputDoesNotClobberRouteFiles(output, ['.cookbook-router/register.d.ts']),
    ).toThrow('Refusing to write generated router artifacts over route source file');
  });
});
