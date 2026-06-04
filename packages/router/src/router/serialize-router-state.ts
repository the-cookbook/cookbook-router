import {
  assertSerializedRouterState,
  parseSerializedRouterState,
  stringifySerializedRouterState,
} from '../security/serialized-state';
import type { Router, SerializedRouterState } from './create-router';

/** Extracts the router state needed to hydrate a matching client router. */
export function serializeRouterState(router: Pick<Router, 'serialize'>): SerializedRouterState {
  return assertSerializedRouterState(router.serialize());
}

/** Serializes router hydration state to a JSON string with validation hardening. */
export function stringifyRouterState(router: Pick<Router, 'serialize'>): string {
  return stringifySerializedRouterState(router.serialize());
}

/** Parses serialized hydration state and validates the expected router-state shape. */
export function deserializeRouterState(
  state: SerializedRouterState | string,
): SerializedRouterState {
  return typeof state === 'string'
    ? parseSerializedRouterState(state)
    : assertSerializedRouterState(state);
}
