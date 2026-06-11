import { fireEvent, render, waitFor } from '@testing-library/react';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { App } from './app';
import { createTestRouter } from './router';
import { lifecycleEvents } from './routes';

interface ExpectedParams {
  id: number;
}

describe('react-basic example', () => {
  it('renders typed params, search, and hash from workspace packages', async () => {
    const router = createTestRouter(['/users/42?tab=settings#profile']);
    await router.start();

    const { getByText } = render(<App router={router} />);

    expect(getByText('User 42')).toBeTruthy();
    expect(getByText('/users/42?tab=settings#profile')).toBeTruthy();
    expect(
      router.href('users.show', {
        params: { id: 42 },
        search: { tab: 'settings' },
        hash: 'security',
      }),
    ).toBe('/users/42?tab=settings#security');
    expect(router.href('products', { search: { tags: ['router', 'typescript'] } })).toBe(
      '/products?tags=router%2Ctypescript',
    );
    expect(
      router.href('products', {
        search: { tags: ['router', 'typescript'] },
        url: { arrayFormat: 'repeat' },
      }),
    ).toBe('/products?tags=router&tags=typescript');
    expectTypeOf<{ id: number }>().toEqualTypeOf<ExpectedParams>();
  });

  it('renders URLKit array format overrides from React calls', async () => {
    const router = createTestRouter(['/products?tags=router&tags=typescript']);
    await router.start();

    const { getByText } = render(<App router={router} />);

    expect(getByText('Products')).toBeTruthy();
    expect(getByText('Tags: router, typescript')).toBeTruthy();
  });

  it('runs middleware and lifecycle around navigation', async () => {
    lifecycleEvents.length = 0;
    const router = createTestRouter(['/']);
    await router.start();

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
