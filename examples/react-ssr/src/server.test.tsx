import { render } from '@testing-library/react';
import { createRouter, deserializeRouterState, type SerializedRouterState } from '@cookbook/router';
import { describe, expect, expectTypeOf, test } from 'vitest';
import { App } from './app';
import { renderRequest } from './server';
import { routes, ssrEvents } from './routes';

describe('react-ssr example', () => {
  test('renders SSR HTML and embeds hydration data', async () => {
    ssrEvents.length = 0;
    const html = await renderRequest('/articles/typed-routing?preview=true#summary');

    expect(html).toContain('Article: typed-routing');
    expect(html).toContain('window.__COOKBOOK_ROUTER__');
    expect(ssrEvents).toEqual([
      'middleware:/articles/typed-routing',
      'after:/articles/typed-routing',
    ]);
  });

  test('hydrates from serialized state while preserving typed hrefs', async () => {
    const hydrationData: SerializedRouterState = {
      location: {
        pathname: '/articles/typed-routing',
        search: '?preview=true',
        hash: '#summary',
        href: '/articles/typed-routing?preview=true#summary',
        key: 'hydrated',
      },
      navigation: 'idle',
    };
    const router = createRouter({ routes, hydrationData: deserializeRouterState(hydrationData) });

    const { getByText } = render(<App router={router} />);

    expect(getByText('Article: typed-routing')).toBeTruthy();
    expect(
      router.href('articles.show', {
        params: { slug: 'typed-routing' },
        search: { preview: 'true' },
        hash: 'comments',
      }),
    ).toBe('/articles/typed-routing?preview=true#comments');
    expectTypeOf<{ slug: string }>().toEqualTypeOf<{ slug: string }>();
  });
});
