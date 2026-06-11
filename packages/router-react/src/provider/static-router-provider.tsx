import type { ComponentType, ReactElement, ReactNode } from 'react';
import type { Middleware, Router } from '@cookbook/router';
import { RouterProvider } from './router-provider';
import type { RouterErrorFallbackProps } from './router-provider';

/** Props for rendering a router in SSR/static environments. */
export interface StaticRouterProviderProps {
  readonly router: Router;
  readonly children?: ReactNode;
  readonly fallback?: ReactNode;
  readonly loadingFallback?: ReactNode;
  readonly errorFallback?: ComponentType<RouterErrorFallbackProps>;
  readonly middleware?: readonly Middleware[];
}

/**
 * Thin SSR/static wrapper around `RouterProvider`.
 *
 * Use with a static router created for the current request URL.
 */
export function StaticRouterProvider(props: StaticRouterProviderProps): ReactElement {
  return (
    <RouterProvider
      router={props.router}
      {...(props.fallback === undefined ? {} : { fallback: props.fallback })}
      {...(props.loadingFallback === undefined ? {} : { loadingFallback: props.loadingFallback })}
      {...(props.errorFallback === undefined ? {} : { errorFallback: props.errorFallback })}
      {...(props.middleware === undefined ? {} : { middleware: props.middleware })}
    >
      {props.children}
    </RouterProvider>
  );
}
