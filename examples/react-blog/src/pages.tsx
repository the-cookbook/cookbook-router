import { useEffect } from 'react';
import {
  Link,
  NavLink,
  Outlet,
  Slot,
  useHashParams,
  useNavigate,
  useOutletContext,
  useParams,
  useRouter,
  useSearchParams,
} from '@cookbook/router-react';
import type { RouteErrorFallbackProps } from '@cookbook/router-react';
import { login, logout } from './auth';
import {
  archiveYears,
  articlesByYear,
  featuredArticle,
  findArticle,
  searchArticles,
  type Article,
} from './articles';

const normalizeManyValues = (
  value: string | readonly string[] | undefined,
): readonly string[] | null => {
  if (!value) return null;

  return typeof value === 'string' ? [value] : value;
};

export function BlogLayout() {
  return (
    <main className="site-shell">
      <header className="hero panel">
        <p className="eyebrow">Cookbook Journal</p>
        <div className="hero-grid">
          <div>
            <h1>Blog</h1>
            <p className="hero-copy">
              Real routing patterns for production React applications: typed links, route
              interception, protected areas, redirects, and SSR-ready UI.
            </p>
          </div>
          <nav className="nav" aria-label="Blog navigation">
            <NavLink to="blog.home" className="nav-link" end>
              {({ isActive }) => <span data-active={isActive}>Home</span>}
            </NavLink>
            <NavLink to="blog.articles" className="nav-link">
              {({ isActive }) => <span data-active={isActive}>Articles</span>}
            </NavLink>
            <NavLink to="blog.archive" className="nav-link" end>
              {({ isActive }) => <span data-active={isActive}>Archive</span>}
            </NavLink>
            <NavLink to="blog.members" className="nav-link" end>
              {({ isActive }) => <span data-active={isActive}>Editorial desk</span>}
            </NavLink>
          </nav>
        </div>
      </header>

      <section className="layout-grid">
        <div className="content stack">
          <Outlet />
        </div>
        <aside className="rail stack" aria-label="Blog sidebar">
          <Slot name="sidebar" context={{ source: 'blog-sidebar' }} />
          <Slot name="preview" context={{ source: 'article-preview' }} />
        </aside>
      </section>

      <Slot<{ source: string }> name="modal" context={{ source: 'blog-index' }} />
    </main>
  );
}

export function BlogHomePage() {
  const featured = featuredArticle();
  const results = searchArticles(undefined).slice(0, 2);

  return (
    <section className="stack">
      <article className="feature-card panel">
        <div>
          <p className="eyebrow">Featured article</p>
          <h2>{featured.title}</h2>
          <p className="muted">{featured.excerpt}</p>
          <ArticleActions article={featured} referrer="home" />
        </div>
        <dl className="meta-grid">
          <div>
            <dt>Category</dt>
            <dd>{featured.category}</dd>
          </div>
          <div>
            <dt>Read</dt>
            <dd>{featured.readingMinutes} min</dd>
          </div>
          <div>
            <dt>Author</dt>
            <dd>{featured.author.name}</dd>
          </div>
        </dl>
      </article>

      <section className="panel stack">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Latest thinking</p>
            <h2>Recent articles</h2>
          </div>
          <Link to="blog.articles" className="button button-secondary">
            Browse all articles
          </Link>
        </div>
        <ArticleList articles={results} referrer="home-list" />
      </section>
    </section>
  );
}

export function ArticlesPage() {
  const search = useSearchParams('blog.articles');
  const query = normalizeSingleValue(search.query);
  const results = searchArticles(query);

  return (
    <section className="panel stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Articles</p>
          <h2>{query ? `Search results for “${query}”` : 'All articles'}</h2>
        </div>
        <div className="search-links" aria-label="Article search examples">
          <Link to="blog.articles" search={{ query: 'routing' }} className="chip">
            Search routing
          </Link>
          <Link to="blog.articles" search={{ query: 'auth' }} className="chip">
            Search auth
          </Link>
          <Link to="blog.articles" className="chip">
            Clear search
          </Link>
        </div>
      </div>

      {results.length ? (
        <ArticleList articles={results} referrer="articles" />
      ) : (
        <p className="empty-state">No articles matched this search.</p>
      )}
    </section>
  );
}

export function ArchivePage() {
  return (
    <section className="panel stack">
      <p className="eyebrow">Archive</p>
      <h2>Article archive</h2>
      {archiveYears().map((year) => (
        <section key={year} className="archive-group">
          <h3>{year}</h3>
          <ArticleList articles={articlesByYear(year)} referrer={`archive-${year}`} compact />
        </section>
      ))}
    </section>
  );
}

export function ArticleLoading() {
  return (
    <article className="article-page panel stack" aria-busy="true">
      <p className="eyebrow">Loading</p>
      <h1>Preparing article…</h1>
      <p className="muted">The article route is loading its React component.</p>
    </article>
  );
}

export function ArticleErrorFallback(props: RouteErrorFallbackProps) {
  return (
    <article className="article-page panel stack" role="alert">
      <p className="eyebrow">Article error</p>
      <h1>Article failed to render</h1>
      <p className="muted">The article route caught a React rendering error.</p>
      <p className="muted">Route: {props.route.id}</p>
      <p className="muted">
        Error: {props.error instanceof Error ? JSON.stringify(props.error.message) : 'unknown'}
      </p>
      <button className="button" type="button" onClick={props.reset}>
        Try again
      </button>
    </article>
  );
}

export function ArticlePage() {
  const params = useParams('blog.articles.show');
  const search = useSearchParams('blog.articles.show');
  const hash = useHashParams();
  const article = findArticle(params.slug);

  if (!article) {
    return (
      <article className="panel stack">
        <h1>Article not found</h1>
        <p>Full page route for {params.slug}</p>
      </article>
    );
  }

  if (params.slug === 'broken-page') {
    throw new Error('Demo route error: broken-page');
  }

  return (
    <article className="article-page panel stack">
      <p className="eyebrow">{article.category}</p>
      <h1>{article.title}</h1>
      <p className="lead">{article.excerpt}</p>
      <p className="muted">Full page route for {params.slug}</p>
      <ArticleMeta article={article} />
      <div className="article-body">
        {article.body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      <footer className="article-footer">
        <p>ref: {normalizeSingleValue(search.ref) ?? 'direct'}</p>
        <p>filters: {normalizeManyValues(search.filters)?.join(', ') ?? 'none'}</p>
        <p>hash: {hash ?? 'none'}</p>
      </footer>
    </article>
  );
}

export function ArticleModal() {
  const params = useParams('blog.articles.show');
  const context = useOutletContext<{ source: string }>();
  const navigate = useNavigate();
  const article = findArticle(params.slug);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      navigate.back();
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigate]);

  function handleBack() {
    navigate.back();
  }

  if (params.slug === 'broken-page') {
    throw new Error('Demo route error: broken-page');
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal stack" role="dialog" aria-label="Blog post modal">
        <p className="eyebrow">Article preview modal</p>
        <h1>{article?.title ?? 'Article not found'}</h1>
        <p>Modal route for {params.slug}</p>
        <p>Rendered on {context.source}</p>
        {article ? <p className="muted">{article.excerpt}</p> : null}
        {article ? <ArticleMeta article={article} /> : null}
        <div className="actions">
          <Link
            to="blog.articles.show"
            params={{ slug: params.slug }}
            search={{ ref: 'modal-full-page' }}
            className="button"
          >
            Open full article page
          </Link>
          <button className="button button-secondary" type="button" onClick={handleBack}>
            Back
          </button>
        </div>
      </section>
    </div>
  );
}

export function BlogSidebar() {
  const context = useOutletContext<{ source: string }>();
  const featured = featuredArticle();

  return (
    <section className="panel stack compact-panel">
      <p className="eyebrow">Reader tools</p>
      <h2>Search and shortcuts</h2>
      <p className="muted">Sidebar context: {context.source}</p>
      <div className="search-links">
        <Link to="blog.articles" search={{ query: 'routing' }} className="chip">
          Routing
        </Link>
        <Link to="blog.articles" search={{ query: 'auth' }} className="chip">
          Auth
        </Link>
        <Link to="blog.archive" className="chip">
          Archive
        </Link>
      </div>
      <div className="newsletter-card">
        <strong>Featured</strong>
        <Link to="blog.articles.show" params={{ slug: featured.slug }}>
          {featured.title}
        </Link>
      </div>
    </section>
  );
}

export function ArticleSidebar() {
  const context = useOutletContext<{ source?: string }>();
  const source = context?.source;

  return (
    <aside className="panel stack compact-panel article-sidebar" aria-label="Article tools">
      <div className="stack tight-stack">
        <p className="eyebrow">Reader tools</p>
        <h2>Explore the blog</h2>
        <p className="muted">
          Search by topic, jump into the archive, or continue with the current featured article.
        </p>
        <p className="muted small-copy">Sidebar context: {source}</p>
      </div>

      <nav className="stack tight-stack" aria-label="Topic shortcuts">
        <h3>Topics</h3>
        <div className="search-links">
          <Link to="blog.articles" search={{ query: 'routing' }} className="chip">
            Routing
          </Link>
          <Link to="blog.articles" search={{ query: 'auth' }} className="chip">
            Auth
          </Link>
          <Link to="blog.articles" search={{ query: 'ssr' }} className="chip">
            SSR
          </Link>
          <Link to="blog.archive" className="chip">
            Archive
          </Link>
        </div>
      </nav>
    </aside>
  );
}

export function ArticlePreviewPanel() {
  const context = useOutletContext<{ source: string }>();
  const article = featuredArticle();

  return (
    <section className="panel stack compact-panel">
      <p className="eyebrow">Article preview</p>
      <h2>{article.title}</h2>
      <p className="muted">Slot context: {context.source}</p>
      <p>{article.excerpt}</p>
      <Link
        to="blog.articles.show"
        params={{ slug: article.slug }}
        search={{ ref: 'preview-slot' }}
        hash="comments"
        intercept="modal"
        context={{ source: 'article-preview' }}
        className="button button-secondary"
      >
        Read in modal
      </Link>
    </section>
  );
}

export function MembersPage() {
  const router = useRouter();

  async function handleLogout() {
    const redirect = router.state.location.href;
    logout();
    await router.navigate.replace('blog.login', {
      search: {
        redirect,
      },
    });
  }

  return (
    <section className="panel stack">
      <p className="eyebrow">Restricted area</p>
      <h2>Editorial desk</h2>
      <p>Only signed-in editors can review drafts and publication metrics.</p>
      <div className="dashboard-grid">
        <Metric label="Drafts" value="8" />
        <Metric label="Reviews due" value="3" />
        <Metric label="Scheduled" value="5" />
      </div>
      <button className="button button-danger" type="button" onClick={handleLogout}>
        Logout
      </button>
    </section>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const search = useSearchParams('blog.login');
  const redirect = normalizeRedirect(normalizeSingleValue(search.redirect));

  async function handleLogin() {
    login();
    await navigateToRedirect(navigate, redirect);
  }

  return (
    <section className="panel auth-card stack">
      <p className="eyebrow">Login required</p>
      <h2>Sign in to continue</h2>
      <p>
        You tried to open a restricted route. After login, the redirect parameter sends you back to
        the original location.
      </p>
      <code className="redirect-code">redirect={redirect}</code>
      <button className="button" type="button" onClick={handleLogin}>
        Login
      </button>
    </section>
  );
}

function ArticleActions(props: { readonly article: Article; readonly referrer: string }) {
  return (
    <div className="actions">
      <Link
        to="blog.articles.show"
        params={{ slug: props.article.slug }}
        search={{ filters: [props.article.category, props.referrer], ref: props.referrer }}
        hash="comments"
        intercept="modal"
        context={{ source: props.referrer }}
        className="button"
      >
        Read in modal
      </Link>
      <Link
        to="blog.articles.show"
        params={{ slug: props.article.slug }}
        search={{ filters: 'call-site', ref: 'call-site' }}
        hash="share"
        intercept={{ slot: 'modal', component: ArticleModal }}
        context={{ source: 'call-site' }}
        className="button button-secondary"
      >
        Read with call-site modal
      </Link>
    </div>
  );
}

function ArticleList(props: {
  readonly articles: readonly Article[];
  readonly referrer: string;
  readonly compact?: boolean;
}) {
  return (
    <div className={props.compact ? 'article-list compact-list' : 'article-list'}>
      {props.articles.map((article) => (
        <ArticleCard key={article.slug} article={article} referrer={props.referrer} />
      ))}
    </div>
  );
}

function ArticleCard(props: { readonly article: Article; readonly referrer: string }) {
  return (
    <article className="article-card">
      <div className="article-card-main">
        <p className="eyebrow">{props.article.category}</p>
        <h3>
          <Link
            to="blog.articles.show"
            params={{ slug: props.article.slug }}
            search={{ filters: [props.article.category, props.referrer], ref: props.referrer }}
            hash="comments"
          >
            {props.article.title}
          </Link>
        </h3>
        <p className="muted">{props.article.excerpt}</p>
        <ArticleMeta article={props.article} />
      </div>
      <div className="actions">
        <Link
          to="blog.articles.show"
          params={{ slug: props.article.slug }}
          search={{ filters: [props.article.category, props.referrer], ref: props.referrer }}
          hash="comments"
          intercept="modal"
          context={{ source: props.referrer }}
          className="button"
        >
          Read in modal
        </Link>
        <Link
          to="blog.articles.show"
          params={{ slug: props.article.slug }}
          search={{ filters: 'call-site', ref: 'call-site' }}
          hash="share"
          intercept={{ slot: 'modal', component: ArticleModal }}
          context={{ source: 'call-site' }}
          className="button button-secondary"
        >
          Read with call-site modal
        </Link>
      </div>
    </article>
  );
}

function ArticleMeta(props: { readonly article: Article }) {
  return (
    <dl className="article-meta">
      <div>
        <dt>By</dt>
        <dd>{props.article.author.name}</dd>
      </div>
      <div>
        <dt>Published</dt>
        <dd>{formatDate(props.article.publishedAt)}</dd>
      </div>
      <div>
        <dt>Read</dt>
        <dd>{props.article.readingMinutes} min</dd>
      </div>
    </dl>
  );
}

function Metric(props: { readonly label: string; readonly value: string }) {
  return (
    <div className="metric-card">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function normalizeSingleValue(value: string | readonly string[] | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value[0];
  }

  return value as string;
}

function normalizeRedirect(value: string | undefined): string {
  if (!value) {
    return '/blog';
  }

  if (!value.startsWith('/blog')) {
    return '/blog';
  }

  return value;
}

async function navigateToRedirect(
  navigate: ReturnType<typeof useNavigate>,
  redirect: string,
): Promise<void> {
  const parsed = new URL(redirect, 'http://cookbook.local');
  const href = `${parsed.pathname}${parsed.search}${parsed.hash}`;

  if (href === '/blog' || href === '/blog/') {
    await navigate.replace('blog.home');
    return;
  }

  if (href.startsWith('/blog/articles/')) {
    const slug = parsed.pathname.replace('/blog/articles/', '');
    const ref = parsed.searchParams.get('ref');
    const hash = normalizeArticleHash(parsed.hash);

    await navigate.replace('blog.articles.show', {
      params: { slug },
      ...(ref ? { search: { ref } } : {}),
      ...(hash ? { hash } : {}),
    });
    return;
  }

  if (href.startsWith('/blog/articles')) {
    const query = parsed.searchParams.get('query');

    await navigate.replace('blog.articles', {
      ...(query ? { search: { query } } : {}),
    });
    return;
  }

  if (href.startsWith('/blog/archive')) {
    await navigate.replace('blog.archive');
    return;
  }

  if (href.startsWith('/blog/members')) {
    await navigate.replace('blog.members');
    return;
  }

  await navigate.replace('blog.home');
}

function normalizeArticleHash(value: string): 'comments' | 'share' | '#comments' | '#share' | null {
  if (value === '#comments' || value === '#share') {
    return value;
  }

  if (value === 'comments' || value === 'share') {
    return value;
  }

  return null;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
  }).format(new Date(`${value}T00:00:00Z`));
}
