import { Link, Outlet, useHash, useLocation, useParams, useSearch } from '@cookbook/router-react';

export function RootLayout() {
  return (
    <main className="shell">
      <Outlet />
    </main>
  );
}

export function HomePage() {
  return (
    <section className="panel stack">
      <h1>SSR example</h1>
      <Link
        to="articles.show"
        params={{ slug: 'typed-routing' }}
        search={{ preview: 'true' }}
        hash="summary"
      >
        Read typed routing
      </Link>

      <Link to="ssr.users.show" params={{ id: '1' }} search={{ tab: 'true' }}>
        User route
      </Link>
    </section>
  );
}

export function UserPage() {
  const params = useParams('ssr.users.show');
  const search = useSearch('ssr.users.show');

  return (
    <section className="panel stack">
      <h1>{`User ${params.id}`}</h1>
      <p>{`Tab: ${search.tab ?? 'none'}`}</p>
    </section>
  );
}

export function ArticlePage() {
  const params = useParams('articles.show');
  const search = useSearch('articles.show');
  const hash = useHash();
  const location = useLocation();

  return (
    <article className="panel stack">
      <h1>{`Article: ${params.slug}`}</h1>
      <p>{`Preview: ${search.preview ?? 'false'}`}</p>
      <p>{`Hash: ${hash ?? 'none'}`}</p>
      <p>{location.href}</p>
    </article>
  );
}
