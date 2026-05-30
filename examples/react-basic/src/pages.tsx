import {
  Link,
  NavLink,
  Outlet,
  useHashParams,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from '@cookbook/router-react';

export function RootLayout() {
  return (
    <main className="shell">
      <nav className="nav" aria-label="Primary">
        <NavLink to="home" end>
          Home
        </NavLink>
        <NavLink to="users.show" params={{ id: '42' }} search={{ tab: 'settings' }} hash="profile">
          Ada Lovelace
        </NavLink>
      </nav>
      <Outlet />
    </main>
  );
}

export function HomePage() {
  return (
    <section className="panel stack">
      <h1>Cookbook Router basic example</h1>
      <p className="muted">
        This page demonstrates typed route IDs, params, search params, hash values, middleware, and
        lifecycle hooks.
      </p>
      <Link to="users.show" params={{ id: '7' }} search={{ tab: 'profile' }} hash="security">
        Open user 7 security tab
      </Link>
    </section>
  );
}

export function UserPage() {
  const params = useParams('users.show');
  const search = useSearchParams('users.show');
  const hash = useHashParams();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <section className="panel stack">
      <h1>User {params.id}</h1>
      <dl>
        <dt>tab</dt>
        <dd>{search.tab ?? 'profile'}</dd>
        <dt>hash</dt>
        <dd>{hash ?? 'none'}</dd>
        <dt>href</dt>
        <dd>{location.href}</dd>
      </dl>
      <button
        type="button"
        onClick={() =>
          void navigate.replace('users.show', {
            params: { id: params.id },
            search: { tab: 'settings' },
            hash: 'settings',
          })
        }
      >
        Replace with settings
      </button>
    </section>
  );
}

export function BlockedPage() {
  return (
    <section className="panel">
      <h1>Blocked</h1>
    </section>
  );
}
