import { renderHook } from '@testing-library/react';
import { createMemoryRouter, defineRoutes } from '@cookbook/router';
import { describe, expect, it, vi } from 'vitest';
import { RouterProvider } from '../provider/router-provider';
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
  it('returns blocked state from the when flag', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([{ id: 'home', path: '/', view: Page }] as const),
    });
    await router.start();

    const { result } = renderHook(() => useBlocker({ when: true, message: 'Stop' }), {
      wrapper: createWrapper(router),
    });

    expect(result.current.blocked).toBe(true);
  });

  it('blocks router navigation while enabled', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([
        { id: 'home', path: '/', view: Page },
        { id: 'about', path: '/about', view: Page },
      ] as const),
    });
    await router.start();

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

  it('allows router navigation when the confirmation succeeds', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([
        { id: 'home', path: '/', view: Page },
        { id: 'about', path: '/about', view: Page },
      ] as const),
    });
    await router.start();

    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderHook(() => useBlocker({ when: true, message: 'Continue?' }), {
      wrapper: createWrapper(router),
    });

    await expect(router.navigate.to('about')).resolves.toMatchObject({ navigation: 'idle' });
    expect(router.state.location.href).toBe('/about');

    confirm.mockRestore();
  });

  it('registers and cleans beforeunload listener only when enabled', async () => {
    const router = createMemoryRouter({
      routes: defineRoutes([{ id: 'home', path: '/', view: Page }] as const),
    });
    await router.start();
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
