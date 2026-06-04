/** Fine-grained active matching options for `NavLink.end`. */
export interface NavLinkEndOptions {
  readonly search?: 'all' | 'ignore';
}

/**
 * Active matching mode for `NavLink`.
 *
 * `false` allows prefix path matches. `true` requires the full href. Object form
 * can ignore search while still comparing pathname and hash.
 */
export type NavLinkEnd = boolean | NavLinkEndOptions;

/** Resolves whether a `NavLink` target should be considered active. */
export function resolveNavLinkState(
  currentHref: string,
  currentPathname: string,
  targetHref: string,
  end: NavLinkEnd | undefined,
): { readonly isActive: boolean } {
  return {
    isActive: isNavLinkActive(currentHref, currentPathname, targetHref, end),
  };
}

export function isNavLinkActive(
  currentHref: string,
  currentPathname: string,
  targetHref: string,
  end: NavLinkEnd | undefined,
): boolean {
  const normalizedTargetHref = normalizeActiveHref(targetHref);

  if (normalizedTargetHref === undefined) {
    return false;
  }

  if (!end) {
    return (
      currentHref === normalizedTargetHref ||
      currentPathname.startsWith(withoutSearchOrHash(normalizedTargetHref))
    );
  }

  if (typeof end === 'object' && end.search === 'ignore') {
    return stripSearch(currentHref) === stripSearch(normalizedTargetHref);
  }

  return currentHref === normalizedTargetHref;
}

export function normalizeActiveHref(href: string): string | undefined {
  if (!href) {
    return undefined;
  }

  if (!href.startsWith('http://') && !href.startsWith('https://')) {
    return href;
  }

  if (typeof window === 'undefined') {
    return undefined;
  }

  const url = new URL(href, window.location.href);

  if (url.origin !== window.location.origin) {
    return undefined;
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

function withoutSearchOrHash(href: string): string {
  return href.split(/[?#]/, 1)[0] || '/';
}

function stripSearch(href: string): string {
  const hashIndex = href.indexOf('#');
  const pathAndSearch = hashIndex === -1 ? href : href.slice(0, hashIndex);
  const hash = hashIndex === -1 ? '' : href.slice(hashIndex);
  const searchIndex = pathAndSearch.indexOf('?');

  return `${searchIndex === -1 ? pathAndSearch : pathAndSearch.slice(0, searchIndex)}${hash}`;
}
