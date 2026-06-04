/** Applies a normalized basename to an app-relative pathname. */
export function applyBasename(pathname: string, basename?: string): string {
  const normalizedBasename = normalizeBasename(basename);
  return normalizedBasename ? `${normalizedBasename}${pathname === '/' ? '' : pathname}` : pathname;
}

/** Removes a normalized basename from a location pathname before route matching. */
export function stripBasename(pathname: string, basename?: string): string {
  const normalizedBasename = normalizeBasename(basename);

  if (!normalizedBasename) {
    return pathname;
  }

  if (pathname === normalizedBasename) {
    return '/';
  }

  if (!pathname.startsWith(`${normalizedBasename}/`)) {
    return pathname;
  }

  return pathname.slice(normalizedBasename.length) || '/';
}

/** Normalizes user-authored basenames to the leading-slash, no-trailing-slash form. */
export function normalizeBasename(basename?: string): string {
  if (!basename || basename === '/') {
    return '';
  }

  return basename.startsWith('/') ? basename.replace(/\/$/, '') : `/${basename.replace(/\/$/, '')}`;
}
