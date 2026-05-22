export type StaticRequestInput = string | URL | Request;

export function resolveSafeStaticUrl(input: StaticRequestInput): string {
  if (input instanceof URL) {
    return normalizeStaticUrl(input);
  }

  if (typeof Request !== 'undefined' && input instanceof Request) {
    return normalizeStaticUrl(new URL(input.url));
  }

  if (typeof input === 'string') {
    return normalizeStaticUrl(new URL(input || '/', 'http://cookbook-router.local'));
  }

  throw new Error('Static router URL must be a string, URL, or Request.');
}

function normalizeStaticUrl(url: URL): string {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(
      `Static router URL must use http, https, or a relative path, but received protocol "${url.protocol}".`,
    );
  }

  if (!url.pathname.startsWith('/')) {
    throw new Error('Static router URL must resolve to an absolute pathname.');
  }

  return `${url.pathname}${url.search}${url.hash}`;
}
