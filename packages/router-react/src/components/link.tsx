import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react';
import type { HrefOptions, InterceptInput, RouteId } from '@cookbook/router';
import { useRouter } from '../hooks/use-router';

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
  readonly intercept?: InterceptInput;
  readonly context?: HrefOptions<Route>['context'];
  readonly preventScrollReset?: boolean;
  readonly replace?: boolean;
  readonly children?: ReactNode;
}

export function Link<Route extends RouteId = RouteId>(props: LinkProps<Route>) {
  const {
    route,
    to,
    href: explicitHref,
    params,
    search,
    hash,
    intercept,
    context,
    preventScrollReset,
    replace,
    onClick,
    children,
    ...anchorProps
  } = props;
  const routeId = route ?? to;
  const hrefOptions = createHrefOptions<Route>(
    params,
    search,
    hash,
    intercept,
    context,
    preventScrollReset,
  );
  const router = useRouter();
  const routeHref = routeId ? router.href(routeId, hrefOptions) : undefined;
  const href = explicitHref ?? routeHref ?? '';
  const navigate = router.navigate;

  async function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);

    if (shouldPreserveBrowserBehavior(event, href, anchorProps.target, anchorProps.download)) {
      return;
    }

    event.preventDefault();

    if (!routeId) {
      return;
    }

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

function createHrefOptions<Route extends RouteId>(
  params: HrefOptions<Route>['params'] | undefined,
  search: HrefOptions<Route>['search'] | undefined,
  hash: HrefOptions<Route>['hash'] | undefined,
  intercept: InterceptInput | undefined,
  context: HrefOptions<Route>['context'] | undefined,
  preventScrollReset: boolean | undefined,
): HrefOptions<Route> {
  return {
    ...(params === undefined ? {} : { params }),
    ...(search === undefined ? {} : { search }),
    ...(hash === undefined ? {} : { hash }),
    ...(intercept === undefined ? {} : { intercept }),
    ...(context === undefined ? {} : { context }),
    ...(preventScrollReset === undefined ? {} : { preventScrollReset }),
  } as HrefOptions<Route>;
}
