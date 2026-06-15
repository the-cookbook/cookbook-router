import { extractBalancedObject, extractBalancedDelimited } from './static-source-scanner';

export interface ExtractedRouteDeclarationLiteral {
  readonly exportName: string;
  readonly routeLiteral: string;
}

export interface ExtractedRouteDeclarationStatement {
  readonly exportName: string;
  readonly statement: string;
}

export interface ExtractedDescriptorDeclarationLiteral {
  readonly exportName: string;
  readonly statement: string;
}

export interface ExtractedDefineRouteModuleLiterals {
  readonly routeLiterals: readonly ExtractedRouteDeclarationLiteral[];
  readonly descriptorLiterals: readonly ExtractedDescriptorDeclarationLiteral[];
}

export function extractDefineRouteModuleLiterals(
  path: string,
  contents: string,
): ExtractedDefineRouteModuleLiterals {
  const routeLiterals = extractDefineRouteCalls(path, contents, { exportedOnly: true });

  if (!routeLiterals[0]) {
    throw new Error(
      `Route file "${path}" must export routes from defineRoutes([...]), defineRouteTree({ routes: [...] }), defineRoute({...}), or a static routes array.`,
    );
  }

  return {
    routeLiterals,
    descriptorLiterals: extractDescriptorDeclarations(contents),
  };
}

export function extractRouteDeclarationStatements(
  path: string,
  contents: string,
  options: { readonly exportedOnly?: boolean } = {},
): readonly ExtractedRouteDeclarationStatement[] {
  return extractDefineRouteCalls(path, contents, options).map((literal) => ({
    exportName: literal.exportName,
    statement: `const ${literal.exportName} = defineRoute(${literal.routeLiteral});`,
  }));
}

function extractDefineRouteCalls(
  path: string,
  contents: string,
  options: { readonly exportedOnly?: boolean } = {},
): readonly ExtractedRouteDeclarationLiteral[] {
  const routeLiterals: ExtractedRouteDeclarationLiteral[] = [];
  const namedExports = extractNamedExportMap(contents);
  const defineRouteCall =
    /(?:(export)\s+)?const\s+([A-Za-z_$][\w$]*)(?:\s*:\s*[^=]+)?\s*=\s*defineRoute\s*\(/g;
  let match: RegExpExecArray | null;

  while ((match = defineRouteCall.exec(contents)) !== null) {
    const localName = match[2] ?? 'route';
    const exportNames = resolveRouteExportNames({
      localName,
      directExport: match[1] === 'export',
      exportedOnly: options.exportedOnly === true,
      namedExports,
    });

    if (!exportNames[0]) {
      continue;
    }

    const callStart = match.index + match[0].length;
    const objectStart = contents.indexOf('{', callStart);

    if (objectStart < 0) {
      continue;
    }

    const routeLiteral = extractBalancedObject(path, contents, objectStart);

    for (const exportName of exportNames) {
      routeLiterals.push({
        exportName,
        routeLiteral,
      });
    }
  }

  return routeLiterals;
}

export function resolveRouteExportNames(options: {
  readonly localName: string;
  readonly directExport: boolean;
  readonly exportedOnly: boolean;
  readonly namedExports: ReadonlyMap<string, readonly string[]>;
}): readonly string[] {
  if (!options.exportedOnly) {
    return [options.localName];
  }

  if (options.directExport) {
    return [options.localName];
  }

  return options.namedExports.get(options.localName) ?? [];
}

export function extractNamedExportMap(contents: string): ReadonlyMap<string, readonly string[]> {
  const exportsByLocalName = new Map<string, string[]>();
  const exportPattern = /export\s*{([^}]+)}/g;
  let match: RegExpExecArray | null;

  while ((match = exportPattern.exec(contents)) !== null) {
    if (isReExport(contents, match.index + match[0].length)) {
      continue;
    }

    for (const specifier of (match[1] ?? '').split(',')) {
      const namedExport = toNamedExportSpecifier(specifier.trim());

      if (namedExport === undefined) {
        continue;
      }

      const names = exportsByLocalName.get(namedExport.localName) ?? [];
      names.push(namedExport.exportName);
      exportsByLocalName.set(namedExport.localName, names);
    }
  }

  return exportsByLocalName;
}

function isReExport(contents: string, exportEnd: number): boolean {
  const semicolonIndex = contents.indexOf(';', exportEnd);
  const statementEnd = semicolonIndex === -1 ? contents.length : semicolonIndex + 1;
  const afterExport = contents.slice(exportEnd, statementEnd);
  return /\bfrom\s+['"]/.test(afterExport);
}

function toNamedExportSpecifier(
  source: string,
): { readonly localName: string; readonly exportName: string } | undefined {
  if (!source || source.startsWith('type ')) {
    return undefined;
  }

  const [localName, exportName] = source.split(/\s+as\s+/).map((part) => part.trim());

  if (!localName) {
    return undefined;
  }

  return { localName, exportName: exportName || localName };
}

export function extractDescriptorDeclarations(
  contents: string,
): readonly ExtractedDescriptorDeclarationLiteral[] {
  const descriptors: ExtractedDescriptorDeclarationLiteral[] = [];
  const descriptorCall =
    /(?:export\s+)?const\s+([A-Za-z_$][\w$]*)(?:\s*:\s*[^=]+)?\s*=\s*(defineSearch|defineHash|mergeSearch)\s*\(/g;
  let match: RegExpExecArray | null;

  while ((match = descriptorCall.exec(contents)) !== null) {
    const exportName = match[1] ?? 'descriptor';
    const helperName = match[2] ?? 'defineSearch';
    const callOpen = match.index + match[0].length - 1;
    const callArguments = extractBalancedDelimited(
      'descriptor declaration',
      contents,
      callOpen,
      '(',
      ')',
    );

    descriptors.push({
      exportName,
      statement: `const ${exportName} = ${helperName}${callArguments};`,
    });
  }

  return descriptors;
}
