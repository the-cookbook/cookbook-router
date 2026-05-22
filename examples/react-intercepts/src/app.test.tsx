import { fireEvent, render, waitFor } from '@testing-library/react';
import { describe, expect, expectTypeOf, test } from 'vitest';
import { App, createTestRouter } from './app';

describe('react-intercepts example', () => {
  test('configured interception renders destination in modal slot and preserves source page', async () => {
    const router = createTestRouter(['/gallery']);
    await router.resolveCurrent();
    const { getByText } = render(<App router={router} />);

    fireEvent.click(getByText('Open configured modal'));

    await waitFor(() => expect(getByText('Photo modal 1')).toBeTruthy());
    expect(getByText('Gallery')).toBeTruthy();
    expect(getByText('gallery-modal-slot')).toBeTruthy();
    expect(router.state.location.href).toBe('/photos/1?source=configured#details');
  });

  test('call-site interception and direct visit behavior are distinct', async () => {
    const router = createTestRouter(['/gallery']);
    await router.resolveCurrent();
    const intercepted = render(<App router={router} />);

    fireEvent.click(intercepted.getByText('Open call-site modal'));

    await waitFor(() => expect(intercepted.getByText('Photo modal 2')).toBeTruthy());
    intercepted.unmount();

    const directRouter = createTestRouter(['/photos/2?source=direct#comments']);
    await directRouter.resolveCurrent();
    const direct = render(<App router={directRouter} />);

    expect(direct.getByText('Photo page 2')).toBeTruthy();
    expect(direct.queryByText('Photo modal 2')).toBeNull();
    expectTypeOf<{ id: number }>().toEqualTypeOf<{ id: number }>();
  });
});
