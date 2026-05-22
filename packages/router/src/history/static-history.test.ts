import { describe, expect, test } from 'vitest';
import { createStaticHistory } from './static-history';

describe('static-history', () => {
  test('exposes a fixed parsed location and inert traversal methods', () => {
    const history = createStaticHistory({ url: '/ssr?x=1#top' });
    const unsubscribe = history.listen(() => undefined);

    expect(history.location.href).toBe('/ssr?x=1#top');
    expect(() => history.back()).not.toThrow();
    expect(() => history.forward()).not.toThrow();
    expect(() => history.go(-1)).not.toThrow();
    expect(() => unsubscribe()).not.toThrow();
  });

  test('throws when write navigation is attempted', () => {
    const history = createStaticHistory({ url: '/' });

    expect(() => history.push('/next')).toThrow('Static history cannot push navigation entries.');
    expect(() => history.replace('/next')).toThrow(
      'Static history cannot replace navigation entries.',
    );
  });
});
