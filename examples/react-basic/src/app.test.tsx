import { fireEvent, render, waitFor } from '@testing-library/react';
import { describe, expect, expectTypeOf, test } from 'vitest';
import { App } from './app';
import { createTestRouter } from './router';
import { lifecycleEvents } from './routes';

interface ExpectedParams {
  id: string;
}

describe('react-basic example', () => {
  test('renders typed params, search, and hash from workspace packages', async () => {
    const router = createTestRouter(['/users/42?tab=settings#profile']);
    await router.resolveCurrent();

    const { getByText } = render(<App router={router} />);

    expect(getByText('User 42')).toBeTruthy();
    expect(getByText('/users/42?tab=settings#profile')).toBeTruthy();
    expect(
      router.href('users.show', {
        params: { id: '42' },
        search: { tab: 'settings' },
        hash: 'security',
      }),
    ).toBe('/users/42?tab=settings#security');
    expectTypeOf<{ id: string }>().toEqualTypeOf<ExpectedParams>();
  });

  test('runs middleware and lifecycle around navigation', async () => {
    lifecycleEvents.length = 0;
    const router = createTestRouter(['/']);
    await router.resolveCurrent();

    const { getByText } = render(<App router={router} />);
    fireEvent.click(getByText('Ada Lovelace'));

    await waitFor(() => expect(getByText('User 42')).toBeTruthy());
    expect(lifecycleEvents).toContain('global.beforeNavigate');
    expect(lifecycleEvents).toContain('users.beforeEnter');
    expect(lifecycleEvents).toContain('users.afterEnter');
    expect(lifecycleEvents).toContain('global.afterNavigate');

    await router.navigate.to('blocked');
    expect(router.state.location.href).toBe('/');
  });
});
