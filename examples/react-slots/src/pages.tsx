import { Link, Outlet, Slot, useOutletContext } from '@cookbook/router-react';

export function DashboardLayout() {
  return (
    <main className="shell stack">
      <nav className="nav">
        <Link to="dashboard.overview">Overview route</Link>
        <Link to="dashboard.settings">Settings</Link>
        <Link to="dashboard.activity">Activity slot route</Link>
        <Link to="dashboard.fullscreen">Fullscreen</Link>
      </nav>
      <section className="grid">
        <Outlet />
        <aside className="panel" aria-label="Dashboard sidebar">
          <Slot name="sidebar" context={{ user: 'John Doe' }} />
        </aside>
      </section>
      <Slot name="modal" />
    </main>
  );
}

export function OverviewPage() {
  return (
    <section className="panel">
      <h1>Overview</h1>
    </section>
  );
}

export function SettingsPage() {
  return (
    <section className="panel">
      <h1>Settings page</h1>
    </section>
  );
}

export function ActivityPage() {
  return (
    <section className="panel">
      <h1>Activity</h1>
    </section>
  );
}

export function FullscreenPage() {
  return (
    <section className="panel">
      <h1>Fullscreen page</h1>
    </section>
  );
}

export function DashboardSidebar() {
  const context = useOutletContext<{ user: string }>();
  return <p>Default sidebar for {context.user}</p>;
}

export function SettingsSidebar() {
  const context = useOutletContext<{ user: string }>();
  return <p>Settings sidebar for {context.user}</p>;
}

export function ActivitySidebar() {
  const context = useOutletContext<{ user: string }>();
  return <p>Activity sidebar for {context.user}</p>;
}
