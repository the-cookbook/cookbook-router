import {
  Link,
  Outlet,
  Slot,
  useHashParams,
  useNavigate,
  useOutletContext,
  useParams,
  useSearchParams,
} from '@cookbook/router-react';

export interface SlotContextValue {
  readonly source: 'root-sidebar' | 'blog-modal';
}

export function RootLayout() {
  return (
    <div>
      <header>
        <Link to="home">Home</Link>{' '}
        <Link
          to="users.show"
          params={{ id: 42 }}
          search={{ tab: 'settings', preview: 'true' }}
          hash="profile"
        >
          User 42
        </Link>{' '}
        <Link to="blog.index">Blog</Link> <Link to="private.dashboard">Private</Link>
      </header>
      <aside aria-label="Root sidebar">
        <Slot name="sidebar" context={{ source: 'root-sidebar' } satisfies SlotContextValue} />
      </aside>
      <main>
        <Outlet />
      </main>
    </div>
  );
}

export function HomePage() {
  return <h1>Consumer trial home</h1>;
}

export function UserPage() {
  const params = useParams('users.show');
  const search = useSearchParams('users.show');
  const hash = useHashParams();

  return (
    <section>
      <h1>User {params.id}</h1>
      <p>Tab: {search.tab ?? 'overview'}</p>
      <p>Preview: {search.preview ?? 'false'}</p>
      <p>Hash: {hash ?? 'none'}</p>
    </section>
  );
}

export function UserSidebar() {
  const params = useParams('root.sidebar.user');
  const context = useOutletContext<SlotContextValue>();
  return (
    <p>
      User sidebar {params.id} from {context.source}
    </p>
  );
}

export function RootSidebarFallback() {
  const context = useOutletContext<SlotContextValue>();
  return <p>Sidebar fallback from {context.source}</p>;
}

export function LoginPage() {
  return <h1>Login required</h1>;
}

export function PrivateDashboardPage() {
  return <h1>Private dashboard</h1>;
}

export function BlogLayout() {
  return (
    <section>
      <Outlet />
      <Slot name="modal" context={{ source: 'blog-modal' } satisfies SlotContextValue} />
    </section>
  );
}

export function BlogIndexPage() {
  return (
    <article>
      <h1>Blog</h1>
      <Link to="blog.posts.show" params={{ slug: 'typed-routing' }} intercept="modal">
        Open configured modal
      </Link>{' '}
      <Link
        to="blog.posts.show"
        params={{ slug: 'ssr-routing' }}
        intercept={{ slot: 'modal', element: BlogPostModal }}
      >
        Open call-site modal
      </Link>
    </article>
  );
}

export function BlogPostPage() {
  const params = useParams('blog.posts.show');
  return <h1>Full blog post {params.slug}</h1>;
}

export function BlogPostModal() {
  const params = useParams('blog.posts.show');
  const context = useOutletContext<SlotContextValue>();
  const navigate = useNavigate();

  return (
    <dialog open aria-label="Blog post modal">
      <h2>Modal blog post {params.slug}</h2>
      <p>Slot source: {context.source}</p>
      <button type="button" onClick={() => navigate.back()}>
        Close
      </button>
    </dialog>
  );
}

export function NotFoundPage() {
  return <h1>Route not found</h1>;
}
