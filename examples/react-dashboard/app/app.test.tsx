import { fireEvent, render, waitFor } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { App, createTestRouter } from './app';

describe('react-dashboard example', () => {
  test('redirects the entry route to the overview dashboard', async () => {
    const router = createTestRouter(['/']);
    await router.resolveCurrent();

    const view = render(<App router={router} />);

    expect(router.state.location.href).toBe('/overview');
    expect(view.getByRole('heading', { name: 'Overview' })).toBeTruthy();
    expect(view.getByText('Total Revenue')).toBeTruthy();
  });

  test('keeps overview navigation active when search params are present', async () => {
    const router = createTestRouter(['/overview?visitors=30d']);
    await router.resolveCurrent();

    const view = render(<App router={router} />);
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

    fireEvent.click(view.getByText('Quick Create'));

    await waitFor(() =>
      expect(view.getByRole('dialog', { name: 'Add section' })).toBeTruthy()
    );
    expect(router.state.location.href).toBe('/create');
    expect(view.getByText('Total Revenue')).toBeTruthy();

    router.navigate.back();

    await waitFor(() =>
      expect(view.queryByRole('dialog', { name: 'Add section' })).toBeNull()
    );
    expect(router.state.location.href).toBe('/overview');
  });

  test('renders the canonical create page on direct visit without opening the modal intercept', async () => {
    const router = createTestRouter(['/create']);
    await router.resolveCurrent();

    const view = render(<App router={router} />);

    expect(view.queryByRole('dialog', { name: 'Add section' })).toBeNull();
    expect(view.getByRole('heading', { name: 'Create' })).toBeTruthy();
    expect(view.getByRole('heading', { name: 'Add section' })).toBeTruthy();
  });

  test('renders user details through the custom slug constraint', async () => {
    const router = createTestRouter(['/users/eddie-lake']);
    await router.resolveCurrent();

    const view = render(<App router={router} />);

    expect(
      view.getByRole('heading', { name: 'Eddie Lake', level: 1 })
    ).toBeTruthy();
    expect(view.getByText('eddie.lake@example.com')).toBeTruthy();
    expect(view.getByText('Workspace Owner')).toBeTruthy();
  });

  test('redirects missing user detail records to not found without freezing', async () => {
    const router = createTestRouter(['/users/missing-user']);
    await router.resolveCurrent();

    const view = render(<App router={router} />);

    await waitFor(() => expect(router.state.location.href).toBe('/not-found'));
    expect(view.getByRole('heading', { name: 'Not found' })).toBeTruthy();
  });

  test('renders reports from the sidebar navigation', async () => {
    const router = createTestRouter(['/overview']);
    await router.resolveCurrent();

    const view = render(<App router={router} />);

    fireEvent.click(view.getByText('Reports'));

    await waitFor(() => expect(router.state.location.href).toBe('/reports'));
    expect(view.getByText('Progress Overview')).toBeTruthy();
    expect(
      view.getAllByRole('heading', { name: 'Reports', level: 1 })
    ).toHaveLength(2);
  });
});
