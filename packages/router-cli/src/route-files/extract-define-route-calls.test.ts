import { describe, expect, it } from 'vitest';
import {
  extractDefineRouteModuleLiterals,
  extractDescriptorDeclarations,
  extractNamedExportMap,
  extractRouteDeclarationStatements,
  resolveRouteExportNames,
} from './extract-define-route-calls';

describe('extract defineRoute calls', () => {
  it('extracts exported defineRoute declarations and descriptor declarations', () => {
    expect(
      extractDefineRouteModuleLiterals(
        'routes.tsx',
        `import { defineHash, defineRoute, defineSearch } from '@cookbook/router';
export const search = defineSearch({ q: { value: 'string', optional: true } } as const);
export const hash = defineHash({ type: 'enum', values: ['comments'], optional: true } as const);
export const postRoute = defineRoute({ id: 'post.show', path: '/posts/{id}' } as const);
`,
      ),
    ).toEqual({
      routeLiterals: [
        { exportName: 'postRoute', routeLiteral: "{ id: 'post.show', path: '/posts/{id}' }" },
      ],
      descriptorLiterals: [
        {
          exportName: 'search',
          statement:
            "const search = defineSearch({ q: { value: 'string', optional: true } } as const);",
        },
        {
          exportName: 'hash',
          statement:
            "const hash = defineHash({ type: 'enum', values: ['comments'], optional: true } as const);",
        },
      ],
    });
  });

  it('extracts named-exported route aliases using their exported names', () => {
    expect(
      extractRouteDeclarationStatements(
        'routes.tsx',
        `const internalRoute = defineRoute({ id: 'internal', path: '/internal' } as const);
export { internalRoute as publicRoute };
`,
        { exportedOnly: true },
      ),
    ).toEqual([
      {
        exportName: 'publicRoute',
        statement: "const publicRoute = defineRoute({ id: 'internal', path: '/internal' });",
      },
    ]);
  });

  it('ignores unexported routes when exportedOnly is enabled', () => {
    expect(() =>
      extractDefineRouteModuleLiterals(
        'routes.tsx',
        "const route = defineRoute({ id: 'home', path: '/' } as const);",
      ),
    ).toThrow('must export routes');
  });

  it('builds local named export maps and skips re-exports and type exports', () => {
    const exports = extractNamedExportMap(`
const local = 1;
export { local as renamed, other };
export { external } from './external';
export { type TypeOnly };
`);

    expect(exports.get('local')).toEqual(['renamed']);
    expect(exports.get('other')).toEqual(['other']);
    expect(exports.has('external')).toBe(false);
    expect(exports.has('TypeOnly')).toBe(false);
  });

  it('resolves route export names based on direct and named exports', () => {
    const namedExports = new Map<string, readonly string[]>([['localRoute', ['publicRoute']]]);

    expect(
      resolveRouteExportNames({
        localName: 'localRoute',
        directExport: false,
        exportedOnly: true,
        namedExports,
      }),
    ).toEqual(['publicRoute']);
    expect(
      resolveRouteExportNames({
        localName: 'localRoute',
        directExport: false,
        exportedOnly: false,
        namedExports,
      }),
    ).toEqual(['localRoute']);
    expect(
      resolveRouteExportNames({
        localName: 'directRoute',
        directExport: true,
        exportedOnly: true,
        namedExports,
      }),
    ).toEqual(['directRoute']);
  });

  it('extracts mergeSearch descriptor declarations', () => {
    expect(
      extractDescriptorDeclarations(
        `const baseSearch = defineSearch({ page: { value: 'number' } } as const);
export const combinedSearch = mergeSearch(baseSearch, defineSearch({ q: { value: 'string' } } as const));`,
      ),
    ).toEqual([
      {
        exportName: 'baseSearch',
        statement: "const baseSearch = defineSearch({ page: { value: 'number' } } as const);",
      },
      {
        exportName: 'combinedSearch',
        statement:
          "const combinedSearch = mergeSearch(baseSearch, defineSearch({ q: { value: 'string' } } as const));",
      },
    ]);
  });
});
