import { render } from '@testing-library/react';
import { createStaticRouter, defineRoutes } from '@cookbook/router';
import { describe, expect, it } from 'vitest';
import { StaticRouterProvider } from './static-router-provider';

function Page() {
  return <h1>static page</h1>;
}

describe('StaticRouterProvider', () => {
  it('renders resolved static router state for SSR', async () => {
    const router = createStaticRouter({
      routes: defineRoutes([{ id: 'page', path: '/page', view: Page }] as const),
      url: 'https://example.it/page?tab=a#top',
    });
    await router.resolveCurrent();

    const { getByText } = render(<StaticRouterProvider router={router} />);

    expect(getByText('static page')).toBeTruthy();
  });

  it('allows explicit children for hydration shells', () => {
    const router = createStaticRouter({
      routes: defineRoutes([{ id: 'page', path: '/page', view: Page }] as const),
      url: 'https://example.it/page',
    });
    const { getByText } = render(
      <StaticRouterProvider router={router}>child</StaticRouterProvider>,
    );

    expect(getByText('child')).toBeTruthy();
  });
});
