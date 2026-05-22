import { describe, expect, it } from 'vitest';
import {
  createGeneratedHrefMismatchError,
  createInvalidParamError,
  createMissingOutletContextError,
  createMissingParamError,
  createMissingPathError,
  createMissingProviderError,
  createUnknownRouteError,
  formatDiagnosticValue,
} from './router-errors';

describe('router diagnostics', () => {
  it('formats route setup errors with actionable messages', () => {
    expect(createUnknownRouteError('users.show').message).toContain(
      'regenerate .cookbook-router/contracts.ts',
    );
    expect(createMissingPathError('root').message).toContain('concrete child route');
    expect(
      createGeneratedHrefMismatchError('users.show', '/users/abc', '/users/{id:int}').message,
    ).toContain('path constraints');
  });

  it('formats param errors with route, param, token, and received value', () => {
    expect(createMissingParamError('users.show', 'id', '{id:int}', undefined).message).toBe(
      'Route "users.show" expected param "id" to satisfy "{id:int}", but received undefined.',
    );
    expect(createInvalidParamError('users.show', 'id', '{id:int}', 'abc').message).toBe(
      'Route "users.show" expected param "id" to satisfy "{id:int}", but received "abc".',
    );
  });

  it('formats React usage errors consistently', () => {
    expect(createMissingProviderError('useRouter').message).toBe(
      'useRouter must be used inside <RouterProvider> or <StaticRouterProvider>.',
    );
    expect(createMissingOutletContextError('dashboard.home').message).toContain(
      'route "dashboard.home"',
    );
    expect(createMissingOutletContextError(undefined).message).not.toContain('route "');
  });

  it('formats diagnostic values', () => {
    expect(formatDiagnosticValue('value')).toBe('"value"');
    expect(formatDiagnosticValue(null)).toBe('null');
    expect(formatDiagnosticValue({ ok: true })).toBe('{"ok":true}');
  });
});
