import { renderToString } from 'react-dom/server';
import { serializeRouterState, stringifyRouterState } from '@cookbook/router';
import { App } from './app';
import { createTrialStaticRouter } from './router';

export async function render(url: string) {
  const router = createTrialStaticRouter(url, { authenticated: true });
  await router.resolveCurrent();
  const appHtml = renderToString(<App router={router} static />);
  const hydrationData = serializeRouterState(router);

  return {
    appHtml,
    hydrationData,
    html: renderDocument(appHtml, stringifyRouterState(router)),
  };
}

function renderDocument(appHtml: string, hydrationDataJson: string): string {
  return `<!doctype html><html lang="en"><head><title>Cookbook Router Consumer Trial</title></head><body><div id="root">${appHtml}</div><script>window.__COOKBOOK_ROUTER__=${hydrationDataJson}</script><script type="module" src="/src/main.tsx"></script></body></html>`;
}
