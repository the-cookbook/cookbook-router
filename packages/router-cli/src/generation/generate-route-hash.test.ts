import { describe, expect, it } from 'vitest';
import { renderRouteHash } from './generate-route-hash';

describe('generate-route-hash', () => {
  it('renders URLKit enum and string hash descriptors', () => {
    expect(renderRouteHash({ type: 'enum', values: ['details', 'reviews'], optional: true })).toBe(
      "'details' | 'reviews' | undefined",
    );
    expect(renderRouteHash({ type: 'string', optional: true })).toBe('string | undefined');
    expect(renderRouteHash({ type: 'string', default: 'top' })).toBe('string');
  });
});
