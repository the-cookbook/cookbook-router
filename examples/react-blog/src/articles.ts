export interface Author {
  readonly name: string;
  readonly role: string;
}

export interface Article {
  readonly slug: string;
  readonly title: string;
  readonly excerpt: string;
  readonly body: readonly string[];
  readonly category: 'Engineering' | 'Design' | 'Operations';
  readonly tags: readonly string[];
  readonly publishedAt: string;
  readonly readingMinutes: number;
  readonly author: Author;
  readonly featured?: boolean;
}

export const articles: readonly Article[] = [
  {
    slug: 'typed-routing',
    title: 'Typed routing in production',
    excerpt:
      'How generated contracts keep product navigation honest while routes evolve across teams.',
    body: [
      'Typed route contracts are most useful when they disappear into the development workflow. Product teams should be able to move quickly while the compiler protects route IDs, params, search values, and hashes.',
      'The practical win is confidence. A refactor that changes a route path should not silently break links, modals, redirects, or server rendering. Cookbook Router keeps route identity separate from URL strings so that application code can stay stable.',
      'In production applications, this also improves review quality. Pull requests show intent through route IDs and contract changes instead of scattered string paths.',
    ],
    category: 'Engineering',
    tags: ['TypeScript', 'DX', 'Routing'],
    publishedAt: '2026-01-14',
    readingMinutes: 6,
    author: {
      name: 'Ada Lovelace',
      role: 'Framework Engineer',
    },
    featured: true,
  },
  {
    slug: 'modal-routes',
    title: 'Modal routes without losing context',
    excerpt:
      'Use route interception to open detail content while preserving the list, filters, and scroll position behind it.',
    body: [
      'Modal routes should still be real routes. A user can open them from a listing as a modal, copy the URL, and revisit that same URL as a full page later.',
      'Interception gives applications the best of both worlds. Client navigation preserves the source UI, while direct entry resolves the canonical destination route.',
      'This pattern is especially useful for article previews, product quick views, media galleries, and admin review workflows.',
    ],
    category: 'Design',
    tags: ['Interception', 'UX', 'Slots'],
    publishedAt: '2025-12-03',
    readingMinutes: 5,
    author: {
      name: 'Grace Hopper',
      role: 'Product Architect',
    },
  },
  {
    slug: 'secure-editorial-workflows',
    title: 'Secure editorial workflows with route middleware',
    excerpt:
      'Protect private editorial tools and return users to their original destination after authentication.',
    body: [
      'Restricted route branches should keep authentication behavior close to routing behavior. Middleware can redirect unauthenticated users before protected UI renders.',
      'A redirect query parameter preserves intent. After signing in, the user returns to the route they originally requested instead of starting over.',
      'This keeps protected workflows predictable and avoids mixing authentication concerns into page components.',
    ],
    category: 'Operations',
    tags: ['Auth', 'Middleware', 'Redirects'],
    publishedAt: '2025-10-21',
    readingMinutes: 7,
    author: {
      name: 'Katherine Johnson',
      role: 'Platform Lead',
    },
  },
  {
    slug: 'broken-page',
    title: 'Preview the route error boundary',
    excerpt:
      'This demo article intentionally fails when opened so the route error component can be previewed.',
    body: [
      'This article is part of the demo dataset and is designed to simulate a broken route render.',
      'When users open this article, the page should throw a controlled error so the configured route error component is displayed.',
      'Use this entry to verify that loading, error fallback, and route-level recovery behavior work as expected.',
    ],
    category: 'Engineering',
    tags: ['Error Boundary', 'Fallback UI', 'Routing'],
    publishedAt: '2025-10-21',
    readingMinutes: 3,
    author: {
      name: 'John Doe',
      role: 'Test Fixture',
    },
  },
];

export function findArticle(slug: string): Article | undefined {
  return articles.find((article) => article.slug === slug);
}

export function featuredArticle(): Article {
  return articles.find((article) => article.featured) ?? articles[0]!;
}

export function searchArticles(query: string | undefined): readonly Article[] {
  const normalized = query?.trim().toLowerCase();

  if (!normalized) {
    return articles;
  }

  return articles.filter((article) => {
    const haystack = [article.title, article.excerpt, article.category, ...article.tags]
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalized);
  });
}

export function archiveYears(): readonly string[] {
  return Array.from(new Set(articles.map((article) => article.publishedAt.slice(0, 4))));
}

export function articlesByYear(year: string): readonly Article[] {
  return articles.filter((article) => article.publishedAt.startsWith(year));
}
