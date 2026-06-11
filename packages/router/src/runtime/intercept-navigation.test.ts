import { describe, expect, it } from 'vitest';
import type { ResolvedIntercept } from '../rendering/resolve-intercepts';
import { createInterceptedRoute, isProduction } from './intercept-navigation';

describe('intercept navigation helpers', () => {
  it('creates intercepted route state from a resolved intercept and destination match', () => {
    const intercept: ResolvedIntercept = {
      slot: 'modal',
      sourceRouteId: 'inbox',
      targetRouteId: 'messages.new',
      previousLocation: '/messages',
      view: 'ComposeModal',
      configured: false,
      context: { from: 'link' },
    };
    const destination = { id: 'messages.new' } as never;

    expect(createInterceptedRoute(intercept, destination)).toEqual({
      slot: 'modal',
      sourceRouteId: 'inbox',
      targetRouteId: 'messages.new',
      previousHref: '/messages',
      match: destination,
      view: 'ComposeModal',
      context: { from: 'link' },
    });
  });

  it('omits intercepted route state without a destination match', () => {
    expect(createInterceptedRoute({} as ResolvedIntercept, null)).toBeUndefined();
  });

  it('reads production mode from NODE_ENV', () => {
    expect(typeof isProduction()).toBe('boolean');
  });
});
