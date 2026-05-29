import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './app';
import { createTrialMemoryRouter } from './router';

async function renderAt(path: string, authenticated = true) {
  const router = createTrialMemoryRouter([path], { authenticated });
  await router.resolveCurrent();
  render(<App router={router} />);
  return router;
}

describe('consumer trial app', () => {
  it('renders typed params, search, hash, and matched slot content', async () => {
    await renderAt('/users/42?tab=settings&preview=true#profile');

    expect(screen.getByRole('heading', { name: 'User 42' })).toBeTruthy();
    expect(screen.getByText('Tab: settings')).toBeTruthy();
    expect(screen.getByText('Preview: true')).toBeTruthy();
    expect(screen.getByText('Hash: profile')).toBeTruthy();
    expect(screen.getByText('User sidebar 42 from root-sidebar')).toBeTruthy();
  });

  it('redirects unauthenticated private navigation through middleware', async () => {
    const router = await renderAt('/', false);

    await router.navigate.to('private.dashboard');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Login required' })).toBeTruthy();
    });
    expect(router.state.location.href).toBe('/login');
  });

  it('runs middleware registered on RouterProvider', async () => {
    const router = createTrialMemoryRouter(['/'], { authenticated: true });
    await router.resolveCurrent();
    render(
      <App
        router={router}
        middleware={[
          ({ route, redirect }) => {
            if (route.id === 'private.dashboard') {
              return redirect('/login');
            }
          },
        ]}
      />,
    );

    await router.navigate.to('private.dashboard');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Login required' })).toBeTruthy();
    });
    expect(router.state.location.href).toBe('/login');
  });

  it('opens configured blog post interception in the modal slot', async () => {
    const router = await renderAt('/blog');

    fireEvent.click(screen.getByRole('link', { name: 'Open configured modal' }));

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Blog post modal' })).toBeTruthy();
    });
    expect(screen.getByText('Modal blog post typed-routing')).toBeTruthy();
    expect(screen.getByText('Slot source: blog-modal')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Blog' })).toBeTruthy();
    expect(router.state.location.href).toBe('/blog/typed-routing');
  });

  it('opens call-site blog post interception in the modal slot', async () => {
    await renderAt('/blog');

    fireEvent.click(screen.getByRole('link', { name: 'Open call-site modal' }));

    await waitFor(() => {
      expect(screen.getByText('Modal blog post ssr-routing')).toBeTruthy();
    });
    expect(screen.getByRole('heading', { name: 'Blog' })).toBeTruthy();
  });

  it('renders canonical post page on direct visit', async () => {
    await renderAt('/blog/direct-visit');
    expect(screen.getByRole('heading', { name: 'Full blog post direct-visit' })).toBeTruthy();
    expect(screen.queryByRole('dialog', { name: 'Blog post modal' })).toBeNull();
  });
});
