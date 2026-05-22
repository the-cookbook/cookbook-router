import { RouterProvider, StaticRouterProvider } from '@cookbook/router-react';
import type { Router } from '@cookbook/router';
import { NotFoundPage } from './pages';

export interface AppProps {
  readonly router: Router;
  readonly static?: boolean;
}

export function App(props: AppProps) {
  const Provider = props.static ? StaticRouterProvider : RouterProvider;
  return <Provider router={props.router} fallback={<NotFoundPage />} />;
}
