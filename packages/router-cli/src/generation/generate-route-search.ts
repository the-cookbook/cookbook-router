import type { RouteSearchSchema } from '@cookbook/router';
import { quote, quoteProperty, renderObject } from './render-types';

type StaticSearchField = RouteSearchSchema[string];

/** Renders generated search contracts from URLKit static descriptors. */
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

export function renderSearchFieldType(field: StaticSearchField): string {
  const element = renderSearchScalarType(field);
  return field.many === true ? `readonly ${element}[]` : element;
}

function renderSearchScalarType(field: StaticSearchField): string {
  if (field.type === 'number' || field.type === 'int') {
    return 'number';
  }

  if (field.type === 'boolean') {
    return 'boolean';
  }

  if (field.type === 'date' || field.type === 'date-time') {
    return 'Date';
  }

  if (field.type === 'enum') {
    return field.values.map((value) => quote(String(value))).join(' | ') || 'never';
  }

  if (field.type === 'string') {
    return 'string';
  }

  return 'unknown';
}

function isOptionalSearchField(field: StaticSearchField): boolean {
  return field.optional === true && !Object.prototype.hasOwnProperty.call(field, 'default');
}
