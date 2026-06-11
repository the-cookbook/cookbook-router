import { render } from '@testing-library/react';
import { createMemoryRouter, defineRoutes } from '@cookbook/router';
import { describe, expect, it } from 'vitest';
import { renderReactRouteMatch } from './render-react-route-match';

function Page() {
  return <p>route page</p>;
}

describe('renderReactRouteMatch', () => {
  it('renders fallback when no branch is active', () => {
    const { getByText } = render(<>{renderReactRouteMatch(null, <p>fallback</p>)}</>);

    expect(getByText('fallback')).toBeTruthy();
  });

  it('renders a matched branch', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([{ id: 'page', path: '/page', view: Page }] as const),
      initialEntries: ['/page'],
    });
    await router.resolveCurrent();

    const { getByText } = render(<>{renderReactRouteMatch(router.state.match, null)}</>);

    expect(getByText('route page')).toBeTruthy();
  });
});
