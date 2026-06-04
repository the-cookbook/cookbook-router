import { render, waitFor } from '@testing-library/react';
import { createRouter, deserializeRouterState, type SerializedRouterState } from '@cookbook/router';
import { afterEach, describe, expect, expectTypeOf, it } from 'vitest';
import { App } from './app';
import { renderRequest } from './server';
import { routes, ssrEvents } from './routes';

describe('react-ssr example', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('renders SSR HTML and embeds hydration data', async () => {
    ssrEvents.length = 0;
    const html = await renderRequest('/articles/typed-routing?preview=true#summary');

    expect(html).toContain('Article: typed-routing');
    expect(html).toContain('window.__COOKBOOK_ROUTER__');
    expect(ssrEvents).toEqual([
      'middleware:/articles/typed-routing',
      'after:/articles/typed-routing',
    ]);
  });

  it('hydrates from serialized state while preserving typed hrefs', async () => {
    const hydrationData: SerializedRouterState = {
      location: {
        pathname: '/articles/typed-routing',
        search: '?preview=true',
        hash: '',
        href: '/articles/typed-routing?preview=true',
        key: 'hydrated',
      },
      navigation: 'idle',
    };
    window.history.replaceState(null, '', '/articles/typed-routing?preview=true#summary');
    const router = createRouter({ routes, hydrationData: deserializeRouterState(hydrationData) });

    const { getByText } = render(<App router={router} />);

    expect(getByText('Article: typed-routing')).toBeTruthy();
    expect(router.state.error).toBeUndefined();
    await waitFor(() => expect(router.state.location.hash).toBe('#summary'));
    expect(getByText('Hash: summary')).toBeTruthy();
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
