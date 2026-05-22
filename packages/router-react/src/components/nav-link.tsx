import type { AnchorHTMLAttributes, ReactNode } from 'react';
import type { HrefOptions, InterceptInput, RouteId } from '@cookbook/router';
import { Link } from './link';
import { useHref } from '../hooks/use-href';
import { useLocation } from '../hooks/use-location';

export interface NavLinkRenderProps {
  readonly isActive: boolean;
}

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
  readonly end?: boolean;
  readonly children?: ReactNode | ((props: NavLinkRenderProps) => ReactNode);
}

export function NavLink<Route extends RouteId = RouteId>(props: NavLinkProps<Route>) {
  const { route, to, params, search, hash, end, children, intercept, context, ...linkProps } =
    props;
  const routeId = route ?? to;

  if (!routeId) {
    throw new Error('NavLink requires either route or to.');
  }

  const href = useHref(routeId, createHrefOptions<Route>(params, search, hash));
  const location = useLocation();
  const isActive = end
    ? location.href === href
    : location.href === href || location.pathname.startsWith(withoutSearchOrHash(href));
  const renderedChildren = typeof children === 'function' ? children({ isActive }) : children;

  return (
    <Link
      {...linkProps}
      route={routeId}
      {...createLinkOptions<Route>(params, search, hash, intercept, context)}
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

function withoutSearchOrHash(href: string): string {
  return href.split(/[?#]/, 1)[0] || '/';
}

function createLinkOptions<Route extends RouteId>(
  params: HrefOptions<Route>['params'] | undefined,
  search: HrefOptions<Route>['search'] | undefined,
  hash: HrefOptions<Route>['hash'] | undefined,
  intercept: InterceptInput | undefined,
  context: HrefOptions<Route>['context'] | undefined,
): Pick<NavLinkProps<Route>, 'params' | 'search' | 'hash' | 'intercept' | 'context'> {
  return {
    ...(params === undefined ? {} : { params }),
    ...(search === undefined ? {} : { search }),
    ...(hash === undefined ? {} : { hash }),
    ...(intercept === undefined ? {} : { intercept }),
    ...(context === undefined ? {} : { context }),
  } as Pick<NavLinkProps<Route>, 'params' | 'search' | 'hash' | 'intercept' | 'context'>;
}
