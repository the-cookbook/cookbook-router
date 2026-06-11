import type { RouterLocation } from '../history/memory-history';
import type { SerializedRouterState } from '../runtime/create-router';

const NAVIGATION_STATES = new Set(['idle', 'pending', 'redirecting', 'blocked', 'error']);

export function stringifySerializedRouterState(state: SerializedRouterState): string {
  return JSON.stringify(assertSerializedRouterState(state)).replace(
    /[<>&\u2028\u2029]/g,
    (character) => {
      switch (character) {
        case '<':
          return '\\u003c';
        case '>':
          return '\\u003e';
        case '&':
          return '\\u0026';
        case '\u2028':
          return '\\u2028';
        case '\u2029':
          return '\\u2029';
        default:
          return character;
      }
    },
  );
}

export function parseSerializedRouterState(serialized: string): SerializedRouterState {
  if (typeof serialized !== 'string' || !serialized) {
    throw new Error('Serialized router state must be a non-empty JSON string.');
  }

  return assertSerializedRouterState(JSON.parse(serialized) as unknown);
}

export function assertSerializedRouterState(value: unknown): SerializedRouterState {
  if (!value || typeof value !== 'object') {
    throw new Error('Serialized router state must be an object.');
  }

  const candidate = value as Partial<SerializedRouterState>;

  if (!isSafeLocation(candidate.location)) {
    throw new Error('Serialized router state contains an invalid location.');
  }

  if (!candidate.navigation || !NAVIGATION_STATES.has(candidate.navigation)) {
    throw new Error('Serialized router state contains an invalid navigation state.');
  }

  return {
    location: cloneLocation(candidate.location),
    navigation: candidate.navigation,
  };
}

function isSafeLocation(value: unknown): value is RouterLocation {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const location = value as Partial<RouterLocation>;
  return (
    isSafePathname(location.pathname) &&
    isSafeSearch(location.search) &&
    isSafeHash(location.hash) &&
    typeof location.href === 'string' &&
    location.href === `${location.pathname}${location.search}${location.hash}` &&
    typeof location.key === 'string' &&
    !location.key.includes('\0')
  );
}

function isSafePathname(pathname: unknown): pathname is string {
  return (
    typeof pathname === 'string' &&
    pathname.startsWith('/') &&
    !pathname.includes('\0') &&
    !pathname.includes('://')
  );
}

function isSafeSearch(search: unknown): search is string {
  return (
    typeof search === 'string' && !search.includes('\0') && (!search || search.startsWith('?'))
  );
}

function isSafeHash(hash: unknown): hash is string {
  return typeof hash === 'string' && !hash.includes('\0') && (!hash || hash.startsWith('#'));
}

function cloneLocation(location: RouterLocation): RouterLocation {
  return {
    pathname: location.pathname,
    search: location.search,
    hash: location.hash,
    href: location.href,
    key: location.key,
    ...(location.state === undefined ? {} : { state: sanitizeSerializableValue(location.state) }),
  };
}

function sanitizeSerializableValue(value: unknown): unknown {
  if (
    value === null ||
    value === undefined ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeSerializableValue);
  }

  if (typeof value === 'object') {
    const clean: Record<string, unknown> = Object.create(null);

    for (const [key, entry] of Object.entries(value)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }

      clean[key] = sanitizeSerializableValue(entry);
    }

    return clean;
  }

  return undefined;
}
