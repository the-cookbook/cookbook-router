import type { ReactElement, ReactNode } from 'react';
import type { Router } from '@cookbook/router';
import { RouterProvider } from './router-provider';

export interface StaticRouterProviderProps {
  readonly router: Router;
  readonly children?: ReactNode;
  readonly fallback?: ReactNode;
}

export function StaticRouterProvider(props: StaticRouterProviderProps): ReactElement {
  return (
    <RouterProvider router={props.router} fallback={props.fallback}>
      {props.children}
    </RouterProvider>
  );
}
