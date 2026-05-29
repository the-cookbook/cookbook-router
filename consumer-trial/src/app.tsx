import { RouterProvider, StaticRouterProvider } from '@cookbook/router-react';
import type { Middleware, Router } from '@cookbook/router';
import { NotFoundPage } from './pages';

export interface AppProps {
  readonly router: Router;
  readonly static?: boolean;
  readonly middleware?: readonly Middleware[];
}

export function App(props: AppProps) {
  const Provider = props.static ? StaticRouterProvider : RouterProvider;
  return (
    <Provider
      router={props.router}
      fallback={<NotFoundPage />}
      {...(props.middleware === undefined ? {} : { middleware: props.middleware })}
    />
  );
}
