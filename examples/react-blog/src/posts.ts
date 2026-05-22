export interface BlogPost {
  readonly slug: string;
  readonly title: string;
  readonly excerpt: string;
}

export const posts: readonly BlogPost[] = [
  {
    slug: 'typed-routing',
    title: 'Typed routing in production',
    excerpt: 'How route contracts keep navigation honest.',
  },
  {
    slug: 'modal-routes',
    title: 'Modal routes without losing context',
    excerpt: 'Using route interception to preserve the index page.',
  },
];

export function findPost(slug: string): BlogPost | undefined {
  return posts.find((post) => post.slug === slug);
}
