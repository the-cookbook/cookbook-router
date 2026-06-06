import type { RouteSearchSchema } from '@cookbook/router';
import { quote, quoteProperty, renderObject } from './render-types';

type StaticSearchValue = NonNullable<RouteSearchSchema[string]>;

/** Renders generated search contracts from URLKit v2 static descriptors. */
export function renderRouteSearch(search: RouteSearchSchema | undefined): string {
  if (!search) {
    return '{}';
  }

  const entries = Object.entries(search).map(([key, field]) => {
    const optional = isOptionalSearchField(field) ? '?' : '';
    return `${quoteProperty(key)}${optional}: ${renderSearchFieldType(field)}`;
  });

  return renderObject(entries);
}

export function renderSearchFieldType(field: StaticSearchValue): string {
  const element = renderSearchValueType(field);
  return isManySearchField(field) ? `readonly ${element}[]` : element;
}

function renderSearchValueType(field: StaticSearchValue): string {
  const descriptor = field;

  if (descriptor.type === 'number' || descriptor.type === 'int') {
    return 'number';
  }

  if (descriptor.type === 'boolean') {
    return 'boolean';
  }

  if (descriptor.type === 'date' || descriptor.type === 'date-time') {
    return 'Date';
  }

  if (descriptor.type === 'enum') {
    return Array.isArray(descriptor.values)
      ? descriptor.values.map((value) => quote(String(value))).join(' | ') || 'never'
      : 'never';
  }

  if (descriptor.type === 'string') {
    return 'string';
  }

  return 'unknown';
}

function isManySearchField(field: StaticSearchValue): boolean {
  return isRecord(field) && field.many === true;
}

function isOptionalSearchField(field: StaticSearchValue): boolean {
  return isRecord(field) && !('default' in field) && field.optional === true;
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input);
}
