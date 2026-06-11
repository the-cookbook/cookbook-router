import { render } from '@testing-library/react';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { App, createTestRouter } from './app';

describe('react-slots example', () => {
  it('redirects the entry route to the dashboard overview', async () => {
    const router = createTestRouter(['/']);
    await router.start();

    const { getByText } = render(<App router={router} />);

    expect(getByText('Overview')).toBeTruthy();
    expect(router.state.location.href).toBe('/dashboard');
  });

  it('renders default slot fallback with typed outlet context', async () => {
    const router = createTestRouter(['/dashboard']);
    await router.start();

    const { getByText } = render(<App router={router} />);

    expect(getByText('Overview')).toBeTruthy();
    expect(getByText('Default sidebar for John Doe')).toBeTruthy();
    expectTypeOf<{ user: string }>().toEqualTypeOf<{ user: string }>();
  });

  it('renders slot route, child slot override, and declaration-only empty slot behavior', async () => {
    const router = createTestRouter(['/dashboard/activity']);
    await router.start();
    const activity = render(<App router={router} />);

    expect(activity.getByText('Activity')).toBeTruthy();
    expect(activity.getByText('Activity sidebar for John Doe')).toBeTruthy();
    activity.unmount();

    await router.navigate.to('dashboard.settings');
    const settings = render(<App router={router} />);
    expect(settings.getByText('Settings sidebar for John Doe')).toBeTruthy();
    settings.unmount();

    await router.navigate.to('dashboard.fullscreen');
    const fullscreen = render(<App router={router} />);
    expect(fullscreen.queryByText(/sidebar for John Doe/)).toBeNull();
  });
});
