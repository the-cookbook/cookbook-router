import { UrlKitError } from '@cookbook/urlkit';
import { describe, expect, it } from 'vitest';
import {
  createRouteUrlContractDiagnostic,
  getErrorMessage,
} from './create-route-url-contract-diagnostic';

describe('createRouteUrlContractDiagnostic', () => {
  it('wraps URLKit errors while preserving code, path, and cause', () => {
    const source = new UrlKitError('invalid-descriptor', 'Static descriptor is invalid.', {
      path: ['search', 'from', 'format'],
    });

    const diagnostic = createRouteUrlContractDiagnostic(source, 'reports.index');

    expect(diagnostic).toBeInstanceOf(UrlKitError);
    expect((diagnostic as UrlKitError).code).toBe('invalid-descriptor');
    expect((diagnostic as UrlKitError).path).toEqual(['search', 'from', 'format']);
    expect(diagnostic.cause).toBe(source);
    expect(diagnostic.message).toContain('Route "reports.index" has an invalid URL descriptor.');
    expect(diagnostic.message).toContain('Static descriptor is invalid.');
  });

  it('uses a generic route URL descriptor prefix when no route id is available', () => {
    const source = new UrlKitError('invalid-descriptor', 'Invalid hash descriptor.');

    const diagnostic = createRouteUrlContractDiagnostic(source, undefined);

    expect(diagnostic).toBeInstanceOf(UrlKitError);
    expect(diagnostic.message).toContain('Route URL descriptor has an invalid URL descriptor.');
  });

  it('returns already contextual URLKit error messages unchanged', () => {
    const source = new Error('Route "home" has an invalid URL descriptor. URLKit error: broken');

    expect(createRouteUrlContractDiagnostic(source, 'home')).toBe(source);
  });

  it('wraps non-URLKit failures with route context and cause', () => {
    const source = new Error('boom');

    const diagnostic = createRouteUrlContractDiagnostic(source, 'home');

    expect(diagnostic).toBeInstanceOf(Error);
    expect(diagnostic).not.toBeInstanceOf(UrlKitError);
    expect(diagnostic.message).toBe(
      'Route "home" has an invalid URL descriptor. URLKit error: boom',
    );
    expect(diagnostic.cause).toBe(source);
  });

  it('stringifies unknown failures', () => {
    expect(getErrorMessage('broken')).toBe('broken');
    expect(getErrorMessage(42)).toBe('42');
  });
});
