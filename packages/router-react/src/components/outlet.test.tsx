import { render } from '@testing-library/react';
import { createMemoryRouter, defineRoutes } from '@cookbook/router';
import { describe, expect, test } from 'vitest';
import { Outlet } from './outlet';
import { RouterProvider } from './router-provider';
import { useOutletContext } from '../hooks/use-outlet-context';

function Layout() {
  return <Outlet context={{ label: 'from layout' }} />;
}

function Page() {
  const context = useOutletContext<{ label: string }>();
  return <p>{context.label}</p>;
}

function MissingContextPage() {
  const context = useOutletContext();
  return <p>{String(context)}</p>;
}

function StrictMissingPage() {
  useOutletContext('dashboard.home', { strict: true });
  return null;
}

describe('Outlet', () => {
  test('renders the matched child route', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([
        {
          id: 'root',
          path: '/',
          layout: { component: Layout },
          children: [{ id: 'page', index: true, component: Page }],
        },
      ] as const),
    });
    await router.resolveCurrent();

    const { getByText } = render(<RouterProvider router={router} />);

    expect(getByText('from layout')).toBeTruthy();
  });

  test('returns undefined context when no outlet context exists', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([{ id: 'page', path: '/', component: MissingContextPage }] as const),
    });
    await router.resolveCurrent();

    const { getByText } = render(<RouterProvider router={router} />);

    expect(getByText('undefined')).toBeTruthy();
  });

  test('throws a descriptive strict-mode error when context is missing', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([{ id: 'page', path: '/', component: StrictMissingPage }] as const),
    });
    await router.resolveCurrent();

    expect(() => render(<RouterProvider router={router} />)).toThrow(
      'Outlet context for route "dashboard.home" was requested in strict mode',
    );
  });
});
