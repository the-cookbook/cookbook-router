import { render } from '@testing-library/react';
import { createMemoryRouter, defineRoutes } from '@cookbook/router';
import { describe, expect, it } from 'vitest';
import { renderMatches } from './render-route-branch';

function Page() {
  return <p>route page</p>;
}

describe('renderMatches', () => {
  it('renders fallback when no branch is active', () => {
    const { getByText } = render(<>{renderMatches([], <p>fallback</p>)}</>);

    expect(getByText('fallback')).toBeTruthy();
  });

  it('renders a matched branch', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([{ id: 'page', path: '/page', component: Page }] as const),
      initialEntries: ['/page'],
    });
    await router.resolveCurrent();

    const { getByText } = render(<>{renderMatches(router.state.match?.branch ?? [], null)}</>);

    expect(getByText('route page')).toBeTruthy();
  });
});
