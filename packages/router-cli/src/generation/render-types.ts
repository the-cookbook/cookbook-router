/** Renders a generated TypeScript interface from route id keyed entries. */
export function renderInterface(
  name: string,
  entries: readonly (readonly [string, string])[],
): string {
  const lines = [`export interface ${name} {`];

  for (const [id, value] of entries) {
    lines.push(`  ${quoteProperty(id)}: ${value};`);
  }

  lines.push('}');
  return lines.join('\n');
}

/** Renders an inline object type from property entries. */
export function renderObject(entries: readonly string[]): string {
  return entries[0] ? `{ ${entries.join('; ')} }` : '{}';
}

/** Quotes a generated string literal. */
export function quote(value: string): string {
  const escaped = value.replaceAll('\\', '\\\\').replaceAll("'", "\\'");
  return `'${escaped}'`;
}

/** Quotes invalid TypeScript property names while keeping identifiers readable. */
export function quoteProperty(value: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(value) ? value : quote(value);
}
