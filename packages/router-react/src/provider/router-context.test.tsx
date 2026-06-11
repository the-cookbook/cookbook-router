import { render } from '@testing-library/react';
import { createMemoryRouter, defineRoutes } from '@cookbook/router';
import { describe, expect, it } from 'vitest';
import { RouterProvider } from '../provider/router-provider';
import { useRouterContext } from './router-context';

function Consumer() {
  const { state } = useRouterContext();
  return <p>{state.location.href}</p>;
}

function Page() {
  return null;
}

describe('router context', () => {
  it('provides router state to descendants', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([{ id: 'home', path: '/', view: Page }] as const),
    });
    await router.start();

    const { getByText } = render(
      <RouterProvider router={router}>
        <Consumer />
      </RouterProvider>,
    );

    expect(getByText('/')).toBeTruthy();
  });

  it('throws outside a provider', () => {
    expect(() => render(<Consumer />)).toThrow(
      'Cookbook Router hooks must be used inside <RouterProvider> or <StaticRouterProvider>.',
    );
  });
});
