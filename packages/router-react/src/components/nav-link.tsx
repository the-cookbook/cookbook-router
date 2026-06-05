import type { AnchorHTMLAttributes, ReactNode } from 'react';
import type { HrefOptions, InterceptInput, RouteId } from '@cookbook/router';
import { Link } from './link';
import { useLocation } from '../hooks/use-location';
import { useRouter } from '../hooks/use-router';
import { resolveLinkHrefOptions } from './resolve-link-href';
import { resolveNavLinkState } from './resolve-nav-link-state';
import type { NavLinkEnd } from './resolve-nav-link-state';
export type { NavLinkEnd, NavLinkEndOptions } from './resolve-nav-link-state';

/** Render props supplied to `NavLink` children. */
export interface NavLinkRenderProps {
  readonly isActive: boolean;
}

/** Props for a route-aware link that exposes active state. */
export interface NavLinkProps<Route extends RouteId = RouteId> extends Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  'children' | 'href'
> {
  readonly route?: Route;
  readonly to?: Route;
  readonly href?: string;
  readonly params?: HrefOptions<Route>['params'];
  readonly search?: HrefOptions<Route>['search'];
  readonly hash?: HrefOptions<Route>['hash'];
  /** Per-component URLKit build options overriding route-level and router-level defaults. */
  readonly url?: HrefOptions<Route>['url'];
  readonly replace?: boolean;
  readonly intercept?: InterceptInput;
  readonly context?: HrefOptions<Route>['context'];
  readonly preventScrollReset?: boolean;
  readonly end?: NavLinkEnd;
  readonly children?: ReactNode | ((props: NavLinkRenderProps) => ReactNode);
}

/**
 * Renders a `Link` with `aria-current="page"` when the target is active.
 *
 * Children may be a render function that receives `isActive`.
 */
export function NavLink<Route extends RouteId = RouteId>(props: NavLinkProps<Route>) {
  const {
    route,
    to,
    params,
    search,
    hash,
    url,
    href: explicitHref,
    end,
    children,
    intercept,
    context,
    preventScrollReset,
    ...linkProps
  } = props;
  const routeId = route ?? to;

  if (!routeId && !explicitHref) {
    throw new Error('NavLink requires route, to, or href.');
  }

  const router = useRouter();
  const routeHrefOptions = resolveLinkHrefOptions<Route>({ params, search, hash, url });
  const href = explicitHref ?? router.href(routeId as Route, routeHrefOptions);
  const location = useLocation();
  const { isActive } = resolveNavLinkState(location.href, location.pathname, href, end);
  const renderedChildren = typeof children === 'function' ? children({ isActive }) : children;

  return (
    <Link
      {...linkProps}
      {...(routeId ? { route: routeId } : {})}
      {...(explicitHref ? { href: explicitHref } : {})}
      {...resolveLinkHrefOptions<Route>({
        params,
        search,
        hash,
        url,
        intercept,
        context,
        preventScrollReset,
      })}
      aria-current={isActive ? 'page' : linkProps['aria-current']}
    >
      {renderedChildren}
    </Link>
  );
}
