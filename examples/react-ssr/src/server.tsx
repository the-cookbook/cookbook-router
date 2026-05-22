import { renderToString } from 'react-dom/server';
import { createStaticRouter, stringifyRouterState } from '@cookbook/router';
import { App } from './app';
import { routes, ssrEvents } from './routes';

export async function renderRequest(url: string | Request) {
  const router = createStaticRouter({
    routes,
    ...(typeof url === 'string' ? { url } : { request: url }),
    middleware: [
      ({ location }) => {
        ssrEvents.push(`middleware:${location.pathname}`);
      },
    ],
    lifecycle: {
      afterNavigate: ({ location }) => {
        ssrEvents.push(`after:${location.pathname}`);
      },
    },
  });

  await router.resolveCurrent();
  const appHtml = renderToString(<App router={router} staticRender />);
  return `<!doctype html><html><head><title>Cookbook Router SSR</title><link rel="stylesheet" href="/src/styles.css"></head><body><div id="root">${appHtml}</div><script>window.__COOKBOOK_ROUTER__=${stringifyRouterState(router)}</script><script type="module" src="/src/main.tsx"></script></body></html>`;
}
