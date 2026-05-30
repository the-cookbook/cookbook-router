import type { AnchorHTMLAttributes, ReactNode } from 'react';
import type { HrefOptions, InterceptInput, RouteId } from '@cookbook/router';
import { Link } from './link';
import { useHref } from '../hooks/use-href';
import { useLocation } from '../hooks/use-location';

/** Render props supplied to `NavLink` children. */
export interface NavLinkRenderProps {
  readonly isActive: boolean;
}

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

/** Props for a route-aware link that exposes active state. */
export interface NavLinkProps<Route extends RouteId = RouteId> extends Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  'children' | 'href'
> {
  readonly route?: Route;
  readonly to?: Route;
  readonly params?: HrefOptions<Route>['params'];
  readonly search?: HrefOptions<Route>['search'];
  readonly hash?: HrefOptions<Route>['hash'];
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
    end,
    children,
    intercept,
    context,
    preventScrollReset,
    ...linkProps
  } = props;
  const routeId = route ?? to;

  if (!routeId) {
    throw new Error('NavLink requires either route or to.');
  }

  const href = useHref(routeId, createHrefOptions<Route>(params, search, hash));
  const location = useLocation();
  const isActive = isNavLinkActive(location.href, location.pathname, href, end);
  const renderedChildren = typeof children === 'function' ? children({ isActive }) : children;

  return (
    <Link
      {...linkProps}
      route={routeId}
      {...createLinkOptions<Route>(params, search, hash, intercept, context, preventScrollReset)}
      aria-current={isActive ? 'page' : linkProps['aria-current']}
    >
      {renderedChildren}
    </Link>
  );
}

function createHrefOptions<Route extends RouteId>(
  params: HrefOptions<Route>['params'] | undefined,
  search: HrefOptions<Route>['search'] | undefined,
  hash: HrefOptions<Route>['hash'] | undefined,
): HrefOptions<Route> {
  return {
    ...(params === undefined ? {} : { params }),
    ...(search === undefined ? {} : { search }),
    ...(hash === undefined ? {} : { hash }),
  } as HrefOptions<Route>;
}

function isNavLinkActive(
  currentHref: string,
  currentPathname: string,
  targetHref: string,
  end: NavLinkEnd | undefined,
): boolean {
  if (!end) {
    return (
      currentHref === targetHref || currentPathname.startsWith(withoutSearchOrHash(targetHref))
    );
  }

  if (typeof end === 'object' && end.search === 'ignore') {
    return stripSearch(currentHref) === stripSearch(targetHref);
  }

  return currentHref === targetHref;
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

function createLinkOptions<Route extends RouteId>(
  params: HrefOptions<Route>['params'] | undefined,
  search: HrefOptions<Route>['search'] | undefined,
  hash: HrefOptions<Route>['hash'] | undefined,
  intercept: InterceptInput | undefined,
  context: HrefOptions<Route>['context'] | undefined,
  preventScrollReset: boolean | undefined,
): Pick<
  NavLinkProps<Route>,
  'params' | 'search' | 'hash' | 'intercept' | 'context' | 'preventScrollReset'
> {
  return {
    ...(params === undefined ? {} : { params }),
    ...(search === undefined ? {} : { search }),
    ...(hash === undefined ? {} : { hash }),
    ...(intercept === undefined ? {} : { intercept }),
    ...(context === undefined ? {} : { context }),
    ...(preventScrollReset === undefined ? {} : { preventScrollReset }),
  } as Pick<
    NavLinkProps<Route>,
    'params' | 'search' | 'hash' | 'intercept' | 'context' | 'preventScrollReset'
  >;
}
