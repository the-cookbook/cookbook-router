import { fireEvent, render, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, expectTypeOf, it } from 'vitest';
import { resetAuth } from './auth';
import { App, createTestRouter } from './app';

describe('react-blog example', () => {
  afterEach(() => {
    resetAuth();
  });

  it('renders a styled real-world blog home with navigation and custom slots', async () => {
    const router = createTestRouter(['/blog']);
    await router.start();
    const { getByText } = render(<App router={router} />);

    expect(getByText('Cookbook Journal')).toBeTruthy();
    expect(getByText('Featured article')).toBeTruthy();
    expect(getByText('Search and shortcuts')).toBeTruthy();
    expect(getByText('Article preview')).toBeTruthy();
    expect(getByText('Editorial desk')).toBeTruthy();
  });

  it('flags the active blog navigation item from the current route', async () => {
    const homeRouter = createTestRouter(['/blog']);
    await homeRouter.start();
    const homeView = render(<App router={homeRouter} />);

    const homeNav = within(homeView.getByRole('navigation', { name: 'Blog navigation' }));
    expect(homeNav.getByRole('link', { name: 'Home' }).getAttribute('aria-current')).toBe('page');
    expect(homeNav.getByRole('link', { name: 'Articles' }).getAttribute('aria-current')).toBeNull();
    homeView.unmount();

    const articlesRouter = createTestRouter(['/blog/articles?query=routing']);
    await articlesRouter.start();
    const articlesView = render(<App router={articlesRouter} />);

    const articlesNav = within(articlesView.getByRole('navigation', { name: 'Blog navigation' }));
    expect(articlesNav.getByRole('link', { name: 'Articles' }).getAttribute('aria-current')).toBe(
      'page',
    );
    expect(articlesNav.getByRole('link', { name: 'Home' }).getAttribute('aria-current')).toBeNull();
    articlesView.unmount();

    const archiveRouter = createTestRouter(['/blog/archive']);
    await archiveRouter.start();
    const archiveView = render(<App router={archiveRouter} />);

    const archiveNav = within(archiveView.getByRole('navigation', { name: 'Blog navigation' }));
    expect(archiveNav.getByRole('link', { name: 'Archive' }).getAttribute('aria-current')).toBe(
      'page',
    );
    expect(
      archiveNav.getByRole('link', { name: 'Articles' }).getAttribute('aria-current'),
    ).toBeNull();
  });

  it('keeps Articles active when an article is opened as an intercepted modal', async () => {
    const router = createTestRouter(['/blog/articles']);
    await router.start();
    const { getAllByText, getByRole } = render(<App router={router} />);

    fireEvent.click(getAllByText('Read in modal')[0]!);

    await waitFor(() => expect(getByRole('dialog', { name: 'Blog post modal' })).toBeTruthy());
    const nav = within(getByRole('navigation', { name: 'Blog navigation' }));
    expect(nav.getByRole('link', { name: 'Articles' }).getAttribute('aria-current')).toBe('page');
    expect(nav.getByRole('link', { name: 'Home' }).getAttribute('aria-current')).toBeNull();
  });

  it('configured blog article interception renders a modal while preserving the article list', async () => {
    const router = createTestRouter(['/blog/articles']);
    await router.start();
    const { getAllByText, getByRole, getByText } = render(<App router={router} />);

    fireEvent.click(getAllByText('Read in modal')[0]!);

    await waitFor(() => expect(getByRole('dialog', { name: 'Blog post modal' })).toBeTruthy());
    expect(getByText('Modal route for typed-routing')).toBeTruthy();
    expect(getByText('Rendered on articles')).toBeTruthy();
    expect(getByText('All articles')).toBeTruthy();
    expect(router.state.location.href).toBe(
      '/blog/articles/typed-routing?filters=Engineering&filters=articles&ref=articles#comments',
    );
  });

  it('call-site article interception is clone-safe and keeps the list route mounted', async () => {
    const router = createTestRouter(['/blog/articles']);
    await router.start();
    const { getAllByText, getByText } = render(<App router={router} />);

    fireEvent.click(getAllByText('Read with call-site modal')[1]!);

    await waitFor(() => expect(getByText('Modal route for modal-routes')).toBeTruthy());
    expect(getByText('Rendered on call-site')).toBeTruthy();
    expect(getByText('All articles')).toBeTruthy();
    expect(router.state.location.href).toBe(
      '/blog/articles/modal-routes?filters=call-site&ref=call-site#share',
    );
  });

  it('article modal Back button returns to the previous route', async () => {
    const router = createTestRouter(['/blog/articles']);
    await router.start();
    const { getAllByText, getByRole, queryByRole } = render(<App router={router} />);

    fireEvent.click(getAllByText('Read in modal')[0]!);

    await waitFor(() => expect(getByRole('dialog', { name: 'Blog post modal' })).toBeTruthy());
    expect(router.state.location.href).toBe(
      '/blog/articles/typed-routing?filters=Engineering&filters=articles&ref=articles#comments',
    );

    fireEvent.click(getByRole('button', { name: 'Back' }));

    await waitFor(() => expect(queryByRole('dialog', { name: 'Blog post modal' })).toBeNull());
    expect(router.state.location.href).toBe('/blog/articles');
  });

  it('article modal closes when Escape is pressed', async () => {
    const router = createTestRouter(['/blog/articles']);
    await router.start();
    const { getAllByText, getByRole, queryByRole } = render(<App router={router} />);

    fireEvent.click(getAllByText('Read in modal')[0]!);

    await waitFor(() => expect(getByRole('dialog', { name: 'Blog post modal' })).toBeTruthy());

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(queryByRole('dialog', { name: 'Blog post modal' })).toBeNull());
    expect(router.state.location.href).toBe('/blog/articles');
  });

  it('direct visit renders the canonical full article page instead of the modal', async () => {
    const router = createTestRouter(['/blog/articles/modal-routes?ref=direct#share']);
    await router.start();

    const { findByText, getByText, queryByText, queryByRole } = render(<App router={router} />);

    expect(
      await findByText('Full page route for modal-routes', {}, { timeout: 3000 }),
    ).toBeTruthy();

    expect(getByText('ref: direct')).toBeTruthy();
    expect(queryByText('Modal route for modal-routes')).toBeNull();
    expect(queryByRole('dialog', { name: 'Blog post modal' })).toBeNull();
    expectTypeOf<{ slug: string }>().toEqualTypeOf<{ slug: string }>();
  });

  it('search and archive routes provide real blog discovery flows', async () => {
    const searchRouter = createTestRouter(['/blog/articles?query=auth']);
    await searchRouter.start();
    const searchView = render(<App router={searchRouter} />);

    expect(searchView.getByText('Search results for “auth”')).toBeTruthy();
    expect(searchView.getByText('Secure editorial workflows with route middleware')).toBeTruthy();
    expect(searchView.queryByText('Modal routes without losing context')).toBeNull();

    const archiveRouter = createTestRouter(['/blog/archive']);
    await archiveRouter.start();
    const archiveView = render(<App router={archiveRouter} />);

    expect(archiveView.getByText('Article archive')).toBeTruthy();
    expect(archiveView.getByText('2026')).toBeTruthy();
    expect(archiveView.getByText('2025')).toBeTruthy();
  });

  it('restricted area redirects to login and returns through the redirect search parameter', async () => {
    const router = createTestRouter(['/blog/members']);
    await router.start();
    const { getByText } = render(<App router={router} />);

    await waitFor(() => expect(getByText('Sign in to continue')).toBeTruthy());
    expect(router.state.location.href).toBe('/blog/login?redirect=%2Fblog%2Fmembers');
    expect(getByText('redirect=/blog/members')).toBeTruthy();

    fireEvent.click(getByText('Login'));

    await waitFor(() =>
      expect(
        getByText('Only signed-in editors can review drafts and publication metrics.'),
      ).toBeTruthy(),
    );
    expect(router.state.location.href).toBe('/blog/members');
  });

  it('logout sends the user to login with a redirect back to the protected location', async () => {
    const router = createTestRouter(['/blog/members']);
    await router.start();
    const { getByText } = render(<App router={router} />);

    fireEvent.click(await waitFor(() => getByText('Login')));
    await waitFor(() =>
      expect(
        getByText('Only signed-in editors can review drafts and publication metrics.'),
      ).toBeTruthy(),
    );

    fireEvent.click(getByText('Logout'));

    await waitFor(() => expect(getByText('Sign in to continue')).toBeTruthy());
    expect(router.state.location.href).toBe('/blog/login?redirect=%2Fblog%2Fmembers');
  });
});
