import { describe, expect, it } from 'vitest';
import { createMemoryRouter } from './create-memory-router';

function BlogLayout() {}
function BlogIndex() {}
function BlogPostPage() {}
function BlogPostModal() {}
function OtherModal() {}

const routes = [
  {
    id: 'blog',
    path: '/blog',
    layout: {
      view: BlogLayout,
      slots: {
        modal: true,
      },
    },
    intercepts: {
      modal: {
        to: 'blog.posts.show',
        view: BlogPostModal,
      },
    },
    children: [{ id: 'blog.index', index: true, view: BlogIndex }],
  },
  { id: 'blog.posts.show', path: '/blog/{slug:regex([a-z0-9-]+)}', view: BlogPostPage },
] as const;

const nestedArticleRoutes = [
  {
    id: 'blog',
    path: '/blog',
    layout: {
      view: BlogLayout,
      slots: {
        modal: true,
      },
    },
    intercepts: {
      modal: {
        to: 'blog.articles.show',
        view: BlogPostModal,
      },
    },
    children: [
      { id: 'blog.articles', path: 'articles', view: BlogIndex },
      {
        id: 'blog.articles.show',
        path: 'articles/{slug:regex([a-z0-9-]+)}',
        view: BlogPostPage,
      },
    ],
  },
] as const;

describe('createRouter intercepting routes', () => {
  it('renders client navigation into an intercepted slot and preserves previous location', async () => {
    const router = createMemoryRouter({ routes, initialEntries: ['/blog'] });

    const state = await router.navigate.to('blog.posts.show', {
      params: { slug: 'hello-world' },
      intercept: 'modal',
      context: { source: 'configured-link' },
    });

    expect(state.location.href).toBe('/blog/hello-world');
    expect(state.previousLocation?.href).toBe('/blog');
    expect(state.match?.intercepted).toMatchObject({
      slot: 'modal',
      sourceRouteId: 'blog',
      targetRouteId: 'blog.posts.show',
      view: BlogPostModal,
      context: { source: 'configured-link' },
    });
  });

  it('automatically applies configured interception during client navigation', async () => {
    const router = createMemoryRouter({ routes, initialEntries: ['/blog'] });

    const state = await router.navigate.to('blog.posts.show', {
      params: { slug: 'hello-world' },
    });

    expect(state.location.href).toBe('/blog/hello-world');
    expect(state.previousLocation?.href).toBe('/blog');
    expect(state.match?.route.id).toBe('blog.posts.show');
    expect(state.match?.intercepted).toMatchObject({
      slot: 'modal',
      sourceRouteId: 'blog',
      targetRouteId: 'blog.posts.show',
      view: BlogPostModal,
    });
  });

  it('keeps automatic configured interception restorable through back and forward', async () => {
    const router = createMemoryRouter({ routes, initialEntries: ['/blog'] });

    await router.navigate.to('blog.posts.show', {
      params: { slug: 'hello-world' },
    });

    router.navigate.back();
    await flushNavigation();
    expect(router.state.location.href).toBe('/blog');
    expect(router.state.match?.intercepted).toBeUndefined();

    router.navigate.forward();
    await flushNavigation();
    expect(router.state.location.href).toBe('/blog/hello-world');
    expect(router.state.previousLocation?.href).toBe('/blog');
    expect(router.state.match?.intercepted).toMatchObject({
      slot: 'modal',
      view: BlogPostModal,
    });
  });

  it('does not automatically reapply a configured intercept from an active intercepted route', async () => {
    const router = createMemoryRouter({ routes, initialEntries: ['/blog'] });

    await router.navigate.to('blog.posts.show', {
      params: { slug: 'hello-world' },
    });

    expect(router.state.match?.intercepted).toBeDefined();

    const state = await router.navigate.to('blog.posts.show', {
      params: { slug: 'hello-world' },
      search: { ref: 'modal-full-page' },
    });

    expect(state.location.href).toBe('/blog/hello-world?ref=modal-full-page');
    expect(state.previousLocation).toBeUndefined();
    expect(state.match?.route.id).toBe('blog.posts.show');
    expect(state.match?.intercepted).toBeUndefined();
  });

  it('does not automatically reapply a nested configured intercept from an active intercepted route', async () => {
    const router = createMemoryRouter({
      routes: nestedArticleRoutes,
      initialEntries: ['/blog/articles'],
    });

    await router.navigate.to('blog.articles.show', {
      params: { slug: 'hello-world' },
    });

    expect(router.state.location.href).toBe('/blog/articles/hello-world');
    expect(router.state.match?.intercepted).toBeDefined();

    const state = await router.navigate.to('blog.articles.show', {
      params: { slug: 'hello-world' },
      search: { ref: 'modal-full-page' },
    });

    expect(state.location.href).toBe('/blog/articles/hello-world?ref=modal-full-page');
    expect(state.previousLocation).toBeUndefined();
    expect(state.match?.route.id).toBe('blog.articles.show');
    expect(state.match?.intercepted).toBeUndefined();
  });

  it('supports call-site interception with view', async () => {
    const router = createMemoryRouter({ routes, initialEntries: ['/blog'] });

    const state = await router.navigate.to('blog.posts.show', {
      params: { slug: 'hello-world' },
      intercept: { slot: 'modal', view: OtherModal },
      context: { source: 'call-site-link' },
    });

    expect(state.match?.intercepted?.view).toBe(OtherModal);
    expect(state.match?.intercepted?.context).toEqual({ source: 'call-site-link' });
  });

  it('resolves configured interception with basename-stripped destination paths', async () => {
    const router = createMemoryRouter({ routes, basename: '/foo', initialEntries: ['/foo/blog'] });

    const state = await router.navigate.to('blog.posts.show', {
      params: { slug: 'hello-world' },
      intercept: 'modal',
    });

    expect(state.location.href).toBe('/foo/blog/hello-world');
    expect(state.previousLocation?.href).toBe('/foo/blog');
    expect(state.match?.intercepted).toMatchObject({
      slot: 'modal',
      sourceRouteId: 'blog',
      targetRouteId: 'blog.posts.show',
      view: BlogPostModal,
    });
  });

  it('keeps call-site interception history state cloneable when basename is configured', async () => {
    const router = createMemoryRouter({ routes, basename: '/foo', initialEntries: ['/foo/blog'] });

    const state = await router.navigate.to('blog.posts.show', {
      params: { slug: 'hello-world' },
      intercept: { slot: 'modal', view: OtherModal },
      context: { source: 'basename-card' },
    });

    expect(state.location.href).toBe('/foo/blog/hello-world');
    expect(state.previousLocation?.href).toBe('/foo/blog');
    expect(state.match?.intercepted?.view).toBe(OtherModal);

    router.navigate.back();
    await flushNavigation();
    expect(router.state.location.href).toBe('/foo/blog');
    expect(router.state.match?.intercepted).toBeUndefined();

    router.navigate.forward();
    await flushNavigation();
    expect(router.state.location.href).toBe('/foo/blog/hello-world');
    expect(router.state.match?.intercepted?.view).toBe(OtherModal);
    expect(router.state.match?.intercepted?.context).toEqual({ source: 'basename-card' });
  });

  it('does not intercept direct visits or static refresh resolution', async () => {
    const router = createMemoryRouter({ routes, initialEntries: ['/blog/hello-world'] });
    const state = await router.start();

    expect(state.match?.route.id).toBe('blog.posts.show');
    expect(state.match?.intercepted).toBeUndefined();
  });

  it('closes on back and reopens on forward through history state', async () => {
    const router = createMemoryRouter({ routes, initialEntries: ['/blog'] });

    await router.navigate.to('blog.posts.show', {
      params: { slug: 'hello-world' },
      intercept: 'modal',
    });

    router.navigate.back();
    await flushNavigation();
    expect(router.state.location.href).toBe('/blog');
    expect(router.state.match?.intercepted).toBeUndefined();

    router.navigate.forward();
    await flushNavigation();
    expect(router.state.location.href).toBe('/blog/hello-world');
    expect(router.state.match?.intercepted?.slot).toBe('modal');
  });

  it('throws for invalid configured intercept targets during router creation', () => {
    expect(() =>
      createMemoryRouter({
        routes: [
          {
            id: 'blog',
            path: '/blog',
            layout: { view: BlogLayout, slots: { modal: true } },
            intercepts: {
              modal: { to: ['missing.show'], view: BlogPostModal },
            },
          },
        ],
      }),
    ).toThrow(/targets unknown route id/);
  });
});

async function flushNavigation(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}
