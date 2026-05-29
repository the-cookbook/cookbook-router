import { fireEvent, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { App, createTestRouter } from './app';
import { auth } from './state/auth';

const lazyPageTimeout = {
  timeout: 3_000,
};

describe('react-dashboard example', () => {
  beforeEach(() => {
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(true);
  });

  test('redirects the entry route to the overview dashboard', async () => {
    const router = createTestRouter(['/']);
    await router.resolveCurrent();

    const view = render(<App router={router} />);

    expect(router.state.location.href).toBe('/overview');
    expect(
      await view.findByRole('heading', { name: 'Overview' }, lazyPageTimeout)
    ).toBeTruthy();
    expect(
      await view.findByText('Total Revenue', {}, lazyPageTimeout)
    ).toBeTruthy();
  });

  test('keeps overview navigation active when search params are present', async () => {
    const router = createTestRouter(['/overview?visitors=30d']);
    await router.resolveCurrent();

    const view = render(<App router={router} />);

    await view.findByText('Total Revenue', {}, lazyPageTimeout);

    const overviewNavigationItem = view
      .getAllByText('Overview')
      .map((element) => element.closest('[data-sidebar="menu-button"]'))
      .find(Boolean);

    expect(overviewNavigationItem?.getAttribute('data-active')).toBe('true');
    expect(router.state.location.href).toBe('/overview?visitors=30d');
  });

  test('opens the create route as an automatic configured modal intercept from overview', async () => {
    const router = createTestRouter(['/overview']);
    await router.resolveCurrent();

    const view = render(<App router={router} />);

    await view.findByText('Total Revenue', {}, lazyPageTimeout);

    fireEvent.click(view.getByText('Quick Create'));

    await waitFor(
      () =>
        expect(view.getByRole('dialog', { name: 'Add section' })).toBeTruthy(),
      lazyPageTimeout
    );

    expect(router.state.location.href).toBe('/create');
    expect(view.getByText('Total Revenue')).toBeTruthy();

    router.navigate.back();

    await waitFor(
      () =>
        expect(view.queryByRole('dialog', { name: 'Add section' })).toBeNull(),
      lazyPageTimeout
    );

    expect(router.state.location.href).toBe('/overview');
  });

  test('renders the canonical create page on direct visit without opening the modal intercept', async () => {
    const router = createTestRouter(['/create']);
    await router.resolveCurrent();

    const view = render(<App router={router} />);

    expect(view.queryByRole('dialog', { name: 'Add section' })).toBeNull();

    expect(
      await view.findByRole('heading', { name: 'Create' }, lazyPageTimeout)
    ).toBeTruthy();

    expect(
      await view.findByRole('heading', { name: 'Add section' }, lazyPageTimeout)
    ).toBeTruthy();
  });

  test('renders user details through the custom slug constraint', async () => {
    const router = createTestRouter(['/users/eddie-lake']);
    await router.resolveCurrent();

    const view = render(<App router={router} />);

    expect(
      await view.findByRole(
        'heading',
        { name: 'Eddie Lake', level: 1 },
        lazyPageTimeout
      )
    ).toBeTruthy();

    expect(
      await view.findByText('eddie.lake@example.com', {}, lazyPageTimeout)
    ).toBeTruthy();
    expect(view.getByText('Workspace Owner')).toBeTruthy();
  });

  test('renders the broken page through the layout error fallback', async () => {
    const router = createTestRouter(['/broken-page']);
    await router.resolveCurrent();

    const view = render(<App router={router} />);

    expect(
      await view.findByRole(
        'heading',
        { name: 'Something went wrong' },
        lazyPageTimeout
      )
    ).toBeTruthy();

    expect(view.getByText('Broken Page')).toBeTruthy();
  });

  test('redirects missing user detail records to not found without freezing', async () => {
    const router = createTestRouter(['/users/missing-user']);
    await router.resolveCurrent();

    const view = render(<App router={router} />);

    await waitFor(
      () => expect(router.state.location.href).toBe('/not-found'),
      lazyPageTimeout
    );

    expect(
      await view.findByRole(
        'heading',
        { name: 'Page not found' },
        lazyPageTimeout
      )
    ).toBeTruthy();
  });

  test('renders reports from the sidebar navigation', async () => {
    const router = createTestRouter(['/overview']);
    await router.resolveCurrent();

    const view = render(<App router={router} />);

    await view.findByText('Total Revenue', {}, lazyPageTimeout);

    fireEvent.click(view.getByText('Reports'));

    await waitFor(
      () => expect(router.state.location.href).toBe('/reports'),
      lazyPageTimeout
    );

    expect(
      await view.findByText('Progress Overview', {}, lazyPageTimeout)
    ).toBeTruthy();
    expect(
      view.getAllByRole('heading', { name: 'Reports', level: 1 })
    ).toHaveLength(2);
  });

  test('redirects to login page on non public access pages', async () => {
    vi.spyOn(auth, 'isAuthenticated').mockReturnValueOnce(false);

    const router = createTestRouter(['/overview']);

    await router.resolveCurrent();

    const view = render(<App router={router} />);

    await waitFor(
      () =>
        expect(router.state.location.href).toBe('/login?redirect=%2Foverview'),
      lazyPageTimeout
    );

    await view.findByText('Login with account');

    fireEvent.click(view.getByText('Login'));

    await waitFor(
      () => expect(router.state.location.href).toBe('/overview'),
      lazyPageTimeout
    );

    expect(
      await view.findByText('Total Revenue', {}, lazyPageTimeout)
    ).toBeTruthy();
    expect(
      view.getAllByRole('heading', { name: 'Overview', level: 1 })
    ).toBeTruthy();
  });
});
