import { render } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { createStaticRouter, defineRoutes } from '@cookbook/router';
import { describe, expect, it } from 'vitest';
import { StaticRouterProvider } from './static-router-provider';

function Page() {
  return <h1>static page</h1>;
}

describe('StaticRouterProvider', () => {
  it('throws when rendered before the static router is started', () => {
    const router = createStaticRouter({
      routes: defineRoutes([{ id: 'page', path: '/page', view: Page }] as const),
      url: 'https://example.it/page',
    });

    expect(() => {
      renderToString(<StaticRouterProvider router={router} />);
    }).toThrow(
      'Cookbook Router static rendering requires a started router. Call `await router.start()` before rendering `<StaticRouterProvider />`.',
    );
  });

  it('renders resolved static router state for SSR', async () => {
    const router = createStaticRouter({
      routes: defineRoutes([{ id: 'page', path: '/page', view: Page }] as const),
      url: 'https://example.it/page?tab=a#top',
    });
    await router.start();

    const { getByText } = render(<StaticRouterProvider router={router} />);

    expect(getByText('static page')).toBeTruthy();
  });

  it('allows explicit children for hydration shells after startup', async () => {
    const router = createStaticRouter({
      routes: defineRoutes([{ id: 'page', path: '/page', view: Page }] as const),
      url: 'https://example.it/page',
    });
    await router.start();

    const { getByText } = render(
      <StaticRouterProvider router={router}>child</StaticRouterProvider>,
    );

    expect(getByText('child')).toBeTruthy();
  });
});
