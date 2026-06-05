import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react';
import type { HrefOptions, InterceptInput, RouteId } from '@cookbook/router';
import { useRouter } from '../hooks/use-router';
import { resolveLinkHrefOptions } from './resolve-link-href';

/**
 * Props for a router-aware anchor.
 *
 * Use `route` or `to` for typed internal navigation. Use `href` when the link is
 * external or should bypass route-id generation. Params/search/hash are inferred
 * from generated contracts when `Register` is augmented.
 */
export interface LinkProps<Route extends RouteId = RouteId> extends Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  'href'
> {
  readonly route?: Route;
  readonly to?: Route;
  readonly href?: string;
  readonly params?: HrefOptions<Route>['params'];
  readonly search?: HrefOptions<Route>['search'];
  readonly hash?: HrefOptions<Route>['hash'];
  /** Per-component URLKit build options overriding route-level and router-level defaults. */
  readonly url?: HrefOptions<Route>['url'];
  readonly intercept?: InterceptInput;
  readonly context?: HrefOptions<Route>['context'];
  readonly preventScrollReset?: boolean;
  readonly replace?: boolean;
  readonly children?: ReactNode;
}

/**
 * Renders an anchor that uses router navigation for unmodified same-origin
 * left-clicks while preserving native browser behavior for external URLs,
 * downloads, targets, and modifier keys.
 */
export function Link<Route extends RouteId = RouteId>(props: LinkProps<Route>) {
  const {
    route,
    to,
    href: explicitHref,
    params,
    search,
    hash,
    url,
    intercept,
    context,
    preventScrollReset,
    replace,
    onClick,
    children,
    ...anchorProps
  } = props;
  const routeId = route ?? to;
  const hrefOptions = resolveLinkHrefOptions<Route>({
    params,
    search,
    hash,
    url,
    intercept,
    context,
    preventScrollReset,
  });
  const router = useRouter();
  const routeHref = routeId ? router.href(routeId, hrefOptions) : undefined;
  const href = explicitHref ?? routeHref ?? '';
  const navigate = router.navigate;

  async function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);

    if (shouldPreserveBrowserBehavior(event, href, anchorProps.target, anchorProps.download)) {
      return;
    }

    if (!routeId) {
      return;
    }

    event.preventDefault();

    if (replace) {
      await navigate.replace(routeId, hrefOptions);
      return;
    }

    await navigate.to(routeId, hrefOptions);
  }

  return (
    <a {...anchorProps} href={href} onClick={handleClick}>
      {children}
    </a>
  );
}

/**
 * Returns true when an anchor click should remain native browser behavior.
 */
export function shouldPreserveBrowserBehavior(
  event: MouseEvent<HTMLAnchorElement>,
  href: string,
  target?: string,
  download?: AnchorHTMLAttributes<HTMLAnchorElement>['download'],
): boolean {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.altKey ||
    event.ctrlKey ||
    event.shiftKey
  ) {
    return true;
  }

  if (target && target !== '_self') {
    return true;
  }

  if (download !== undefined) {
    return true;
  }

  return isExternalHref(href);
}

function isExternalHref(href: string): boolean {
  if (!href) {
    return false;
  }

  if (href.startsWith('mailto:') || href.startsWith('tel:')) {
    return true;
  }

  if (!href.startsWith('http://') && !href.startsWith('https://')) {
    return false;
  }

  if (typeof window === 'undefined') {
    return true;
  }

  return new URL(href, window.location.href).origin !== window.location.origin;
}
