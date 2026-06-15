import type { RouteSearchSchema } from '@cookbook/router';
import { quote, quoteProperty, renderObject } from './render-types';

type StaticSearchField = RouteSearchSchema[string];

/** Renders generated parsed-search contracts from URLKit static descriptors. */
export function renderRouteSearch(search: RouteSearchSchema | undefined): string {
  return renderSearchObject(search, isOptionalParsedSearchField);
}

/** Renders generated navigation/search input contracts from URLKit static descriptors. */
export function renderRouteSearchInput(search: RouteSearchSchema | undefined): string {
  return renderSearchObject(search, isOptionalSearchInputField);
}

export function renderSearchFieldType(field: StaticSearchField): string {
  const element = renderSearchScalarType(field);
  return field.many === true ? `readonly ${element}[]` : element;
}

function renderSearchObject(
  search: RouteSearchSchema | undefined,
  isOptional: (field: StaticSearchField) => boolean,
): string {
  if (!search) {
    return '{}';
  }

  const entries = Object.entries(search).map(([key, field]) => {
    const optional = isOptional(field) ? '?' : '';
    return `${quoteProperty(key)}${optional}: ${renderSearchFieldType(field)}`;
  });

  return renderObject(entries);
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

function isOptionalParsedSearchField(field: StaticSearchField): boolean {
  return field.optional === true && !Object.prototype.hasOwnProperty.call(field, 'default');
}

function isOptionalSearchInputField(field: StaticSearchField): boolean {
  return field.optional === true || Object.prototype.hasOwnProperty.call(field, 'default');
}
