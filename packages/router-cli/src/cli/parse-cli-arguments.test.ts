import { describe, expect, it } from 'vitest';
import { parseCliArguments } from './parse-cli-arguments';

describe('parseCliArguments', () => {
  it('parses commands, route files, out dir, and watch mode', () => {
    expect(
      parseCliArguments([
        'generate',
        '--routes',
        'src/routes.tsx',
        '--routes=src/admin-routes.tsx',
        '--out-dir',
        '.router',
        '--watch',
      ]),
    ).toEqual({
      command: 'generate',
      options: {
        routeFiles: ['src/routes.tsx', 'src/admin-routes.tsx'],
        outDir: '.router',
      },
      watch: true,
      help: false,
      version: false,
      errors: [],
    });
  });

  it('reports missing option values and unexpected positional arguments', () => {
    expect(parseCliArguments(['validate', '--routes', '--out-dir=', 'extra']).errors).toEqual([
      '--routes requires a file path.',
      '--out-dir requires a directory path.',
      'Unexpected positional argument "extra".',
    ]);
  });
});
