import { renderHook } from '@testing-library/react';
import { createMemoryRouter, defineRoutes } from '@cookbook/router';
import { describe, expect, test, vi } from 'vitest';
import { RouterProvider } from '../components/router-provider';
import { useBlocker } from './use-blocker';

function Page() {
  return null;
}

function createWrapper(router: ReturnType<typeof createMemoryRouter>) {
  return ({ children }: { children: import('react').ReactNode }) => (
    <RouterProvider router={router}>{children}</RouterProvider>
  );
}

describe('useBlocker', () => {
  test('returns blocked state from the when flag', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([{ id: 'home', path: '/', component: Page }] as const),
    });
    await router.resolveCurrent();

    const { result } = renderHook(() => useBlocker({ when: true, message: 'Stop' }), {
      wrapper: createWrapper(router),
    });

    expect(result.current.blocked).toBe(true);
  });

  test('blocks router navigation while enabled', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([
        { id: 'home', path: '/', component: Page },
        { id: 'about', path: '/about', component: Page },
      ] as const),
    });
    await router.resolveCurrent();

    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { unmount } = renderHook(() => useBlocker({ when: true, message: 'Stop' }), {
      wrapper: createWrapper(router),
    });

    await expect(router.navigate.to('about')).resolves.toMatchObject({ navigation: 'blocked' });
    expect(router.state.location.href).toBe('/');
    expect(confirm).toHaveBeenCalledWith('Stop');

    unmount();
    confirm.mockRestore();
  });

  test('allows router navigation when the confirmation succeeds', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([
        { id: 'home', path: '/', component: Page },
        { id: 'about', path: '/about', component: Page },
      ] as const),
    });
    await router.resolveCurrent();

    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderHook(() => useBlocker({ when: true, message: 'Continue?' }), {
      wrapper: createWrapper(router),
    });

    await expect(router.navigate.to('about')).resolves.toMatchObject({ navigation: 'idle' });
    expect(router.state.location.href).toBe('/about');

    confirm.mockRestore();
  });

  test('registers and cleans beforeunload listener only when enabled', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([{ id: 'home', path: '/', component: Page }] as const),
    });
    await router.resolveCurrent();
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useBlocker({ when: true }), {
      wrapper: createWrapper(router),
    });

    expect(add).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    unmount();
    expect(remove).toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });
});
