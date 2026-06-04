import type { RouteSearchSchema } from '@cookbook/router';
import { quote, quoteProperty, renderObject } from './render-types';

type StaticSearchValue = NonNullable<RouteSearchSchema[string]>;

/** Renders generated search contracts from URLKit-compatible static descriptors. */
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
  const value = getSearchFieldValue(field);
  const element = renderSearchValueType(value);
  return isManySearchField(field) ? `readonly ${element}[]` : element;
}

function getSearchFieldValue(field: StaticSearchValue): unknown {
  if (typeof field === 'string') {
    return field;
  }

  const descriptor = field as Record<string, unknown>;

  if (descriptor.type === 'date' || descriptor.type === 'enum') {
    return field;
  }

  return descriptor.value ?? 'string';
}

function renderSearchValueType(value: unknown): string {
  if (typeof value === 'string') {
    if (value === 'number' || value === 'int') {
      return 'number';
    }

    if (value === 'boolean') {
      return 'boolean';
    }

    if (
      value === 'date' ||
      value === 'date-time' ||
      value === 'unix-seconds' ||
      value === 'unix-ms'
    ) {
      return 'Date';
    }

    return 'string';
  }

  if (isSearchValueObject(value)) {
    if (value.type === 'date') {
      return 'Date';
    }

    return value.values.map(quote).join(' | ') || 'never';
  }

  return 'unknown';
}

function isManySearchField(field: StaticSearchValue): boolean {
  return (
    typeof field === 'object' &&
    field !== null &&
    (field as Record<string, unknown>).type === 'many'
  );
}

function isOptionalSearchField(field: StaticSearchValue): boolean {
  return (
    typeof field === 'object' &&
    field !== null &&
    !('default' in field) &&
    (field as Record<string, unknown>).optional === true
  );
}

function isSearchValueObject(
  value: unknown,
): value is
  | { readonly type: 'date'; readonly values?: never }
  | { readonly type: 'enum'; readonly values: readonly string[] } {
  return (
    typeof value === 'object' &&
    value !== null &&
    ((value as Record<string, unknown>).type === ('date' as const) ||
      (value as Record<string, unknown>).type === 'enum')
  );
}
