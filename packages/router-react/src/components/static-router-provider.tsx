import type { ComponentType, ReactElement, ReactNode } from 'react';
import type { Router } from '@cookbook/router';
import { RouterProvider } from './router-provider';
import type { RouterErrorFallbackProps } from './router-provider';

export interface StaticRouterProviderProps {
  readonly router: Router;
  readonly children?: ReactNode;
  readonly fallback?: ReactNode;
  readonly loadingFallback?: ReactNode;
  readonly errorFallback?: ComponentType<RouterErrorFallbackProps>;
}

export function StaticRouterProvider(props: StaticRouterProviderProps): ReactElement {
  return (
    <RouterProvider
      router={props.router}
      {...(props.fallback === undefined ? {} : { fallback: props.fallback })}
      {...(props.loadingFallback === undefined ? {} : { loadingFallback: props.loadingFallback })}
      {...(props.errorFallback === undefined ? {} : { errorFallback: props.errorFallback })}
    >
      {props.children}
    </RouterProvider>
  );
}
