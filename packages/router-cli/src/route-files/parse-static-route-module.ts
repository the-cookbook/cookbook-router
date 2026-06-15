import type { RouteFile } from '../contracts';
import { evaluateStaticRouteModule } from './evaluate-static-route-module';
import {
  extractDefineRouteModuleLiterals,
  extractDescriptorDeclarations,
  extractRouteDeclarationStatements,
} from './extract-define-route-calls';
import { extractDefineRouteTreeLiteral } from './extract-define-route-tree-call';
import { extractRouteModuleLiterals } from './extract-define-routes-call';
import { extractRouteOptions } from './extract-route-options';
import { extractStaticConstDeclarations } from './extract-static-constants';
import { assertRouteFile } from './route-file-assertions';
import {
  assertNoUnsupportedRuntimeUrlKitBuilders,
  sanitizeRoutesLiteral,
} from './sanitize-route-module';

export interface ParseStaticRouteModuleOptions {
  readonly constantStatements?: readonly string[];
  readonly descriptorStatements?: readonly string[];
  readonly routeDeclarationStatements?: readonly string[];
}

export function parseStaticRouteModule(
  path: string,
  contents: string,
  options: ParseStaticRouteModuleOptions = {},
): RouteFile {
  try {
    return parseDefineRoutesModule(path, contents, options);
  } catch (error) {
    if (!isMissingRouteExportError(error)) {
      throw error;
    }
  }

  try {
    return parseDefineRouteTreeModule(path, contents, options);
  } catch (error) {
    if (!isMissingRouteExportError(error)) {
      throw error;
    }
  }

  return parseDefineRouteModule(path, contents, options);
}

function parseDefineRoutesModule(
  path: string,
  contents: string,
  options: ParseStaticRouteModuleOptions,
): RouteFile {
  const literals = extractRouteModuleLiterals(path, contents);
  assertNoUnsupportedRuntimeUrlKitBuilders(path, literals.routesLiteral);
  const constantStatements = collectConstantStatements(contents, options);
  const descriptorStatements = collectDescriptorStatements(contents, options);
  const routeDeclarationStatements = collectRouteDeclarationStatements(path, contents, options);
  const routesLiteral = sanitizeRoutesLiteral(literals.routesLiteral);
  const routes = evaluateStaticRouteModule(
    path,
    renderStaticRouteEvaluation(
      constantStatements,
      descriptorStatements,
      routeDeclarationStatements,
      routesLiteral,
    ),
  );
  const routeOptions = extractRouteOptions(path, contents, literals.optionsLiteral);

  return assertRouteFile(path, {
    routes,
    ...(literals.kind === 'defineRoutes'
      ? {
          routeExports: [{ exportName: literals.exportName ?? 'routes', kind: 'routes' as const }],
        }
      : {}),
    ...(routeOptions === undefined ? {} : { routeOptions }),
  });
}

function parseDefineRouteTreeModule(
  path: string,
  contents: string,
  options: ParseStaticRouteModuleOptions,
): RouteFile {
  const literal = extractDefineRouteTreeLiteral(path, contents);
  assertNoUnsupportedRuntimeUrlKitBuilders(path, literal.routesLiteral);
  const constantStatements = collectConstantStatements(contents, options);
  const descriptorStatements = collectDescriptorStatements(contents, options);
  const routeDeclarationStatements = collectRouteDeclarationStatements(path, contents, options);
  const routesLiteral = sanitizeRoutesLiteral(literal.routesLiteral);
  const routes = evaluateStaticRouteModule(
    path,
    renderStaticRouteEvaluation(
      constantStatements,
      descriptorStatements,
      routeDeclarationStatements,
      routesLiteral,
    ),
  );
  const routeOptions = extractRouteOptions(path, contents, literal.treeLiteral);

  const hasImportedRouteDeclarations = Boolean(options.routeDeclarationStatements?.[0]);

  return assertRouteFile(path, {
    routes,
    routeExports: [
      {
        exportName: literal.exportName,
        kind:
          literal.localName === 'routes' && !hasImportedRouteDeclarations ? 'routes' : 'routeTree',
      },
    ],
    ...(routeOptions === undefined ? {} : { routeOptions }),
  });
}

function parseDefineRouteModule(
  path: string,
  contents: string,
  options: ParseStaticRouteModuleOptions,
): RouteFile {
  const literals = extractDefineRouteModuleLiterals(path, contents);
  const constantStatements = collectConstantStatements(contents, options);
  const descriptorStatements = collectDescriptorStatements(contents, options);
  const routeDeclarationStatements = collectRouteDeclarationStatements(path, contents, options);
  const sanitizedRouteLiterals = literals.routeLiterals.map((literal) =>
    sanitizeRoutesLiteral(literal.routeLiteral),
  );

  for (const routeLiteral of sanitizedRouteLiterals) {
    assertNoUnsupportedRuntimeUrlKitBuilders(path, routeLiteral);
  }

  const routes = evaluateStaticRouteModule(
    path,
    renderStaticRouteEvaluation(
      constantStatements,
      descriptorStatements,
      routeDeclarationStatements,
      `[${sanitizedRouteLiterals.map(stripTypeScriptStaticSyntax).join(', ')}]`,
    ),
  );

  return assertRouteFile(path, {
    routes,
    routeExports: literals.routeLiterals.map((literal) => ({
      exportName: literal.exportName,
      kind: 'route' as const,
    })),
  });
}

function collectConstantStatements(
  contents: string,
  options: ParseStaticRouteModuleOptions,
): readonly string[] {
  return [
    ...(options.constantStatements ?? []),
    ...extractStaticConstDeclarations(contents).map((literal) => literal.statement),
  ];
}

function collectDescriptorStatements(
  contents: string,
  options: ParseStaticRouteModuleOptions,
): readonly string[] {
  return [
    ...(options.descriptorStatements ?? []),
    ...extractDescriptorDeclarations(contents).map((literal) => literal.statement),
  ];
}

function collectRouteDeclarationStatements(
  path: string,
  contents: string,
  options: ParseStaticRouteModuleOptions,
): readonly string[] {
  return [
    ...(options.routeDeclarationStatements ?? []),
    ...extractRouteDeclarationStatements(path, contents).map((literal) => literal.statement),
  ];
}

function renderStaticRouteEvaluation(
  constantStatements: readonly string[],
  descriptorStatements: readonly string[],
  routeDeclarationStatements: readonly string[],
  routesLiteral: string,
): string {
  return [
    '(() => {',
    'const defineRoute = (route) => route;',
    'const defineSearch = (descriptor) => descriptor;',
    'const defineHash = (descriptor) => descriptor;',
    'const mergeSearch = (...descriptors) => { const merged = {}; for (const descriptor of descriptors) { for (const [key, value] of Object.entries(descriptor)) { if (Object.prototype.hasOwnProperty.call(merged, key)) throw new Error(`Duplicate search descriptor key \\\"${key}\\\" passed to mergeSearch().`); merged[key] = value; } } return merged; };',
    ...constantStatements.map(stripTypeScriptStaticSyntax),
    ...descriptorStatements.map(stripTypeScriptStaticSyntax),
    ...routeDeclarationStatements.map((statement) =>
      stripTypeScriptStaticSyntax(sanitizeRoutesLiteral(statement)),
    ),
    `return ${stripTypeScriptStaticSyntax(routesLiteral)};`,
    '})()',
  ].join('\n');
}

function stripTypeScriptStaticSyntax(source: string): string {
  return source
    .replace(/\s+as\s+const\b/g, '')
    .replace(/\s+satisfies\s+[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?(?:<[^>]+>)?/g, '');
}

function isMissingRouteExportError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('must export routes from');
}
