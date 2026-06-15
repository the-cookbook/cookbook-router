import { describe, expect, it } from 'vitest';
import { extractStaticConstDeclarations } from './extract-static-constants';

describe('extractStaticConstDeclarations', () => {
  it('extracts supported literal constants and strips TypeScript-only suffixes', () => {
    expect(
      extractStaticConstDeclarations(`
const title = 'Dashboard' as const;
export const meta = { title, access: 'private' } satisfies RouteMeta;
export const tabs = ['overview', 'reports'] as const;
export const enabled = true;
export const pageSize = 25;
`),
    ).toEqual([
      { exportName: 'title', statement: "const title = 'Dashboard';" },
      { exportName: 'meta', statement: "const meta = { title, access: 'private' };" },
      { exportName: 'tabs', statement: "const tabs = ['overview', 'reports'];" },
      { exportName: 'enabled', statement: 'const enabled = true;' },
      { exportName: 'pageSize', statement: 'const pageSize = 25;' },
    ]);
  });

  it('ignores route declarations, runtime expressions, and reserved routes export', () => {
    expect(
      extractStaticConstDeclarations(
        `
export const routes = [];
const view = () => null;
const constraint = createPathConstraint({ parse: () => undefined });
const created = new Date();
const computed = getMeta();
const dynamicTemplate = ` +
          '`hello ${name}`' +
          `;
const staticTemplate = ` +
          '`hello`' +
          `;
`,
      ),
    ).toEqual([{ exportName: 'staticTemplate', statement: 'const staticTemplate = `hello`;' }]);
  });

  it('keeps multiline object and array literals intact', () => {
    expect(
      extractStaticConstDeclarations(`
const meta = {
  title: 'Reports',
  nested: { active: true },
};
const search = [
  'from',
  'to',
];
`),
    ).toEqual([
      {
        exportName: 'meta',
        statement: "const meta = {\n  title: 'Reports',\n  nested: { active: true },\n};",
      },
      { exportName: 'search', statement: "const search = [\n  'from',\n  'to',\n];" },
    ]);
  });
});
