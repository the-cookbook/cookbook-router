import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { serializeRouterState } from '@cookbook/router';
import { App } from './app';
import { createTrialRouter, createTrialStaticRouter } from './router';
import { render } from './entry-server';

function normalizeReactHtml(html: string): string {
  return html.replaceAll('<!-- -->', '');
}

describe('consumer trial SSR and hydration setup', () => {
  it('renders an SSR document with serialized router state', async () => {
    const result = await render('/users/7?tab=profile#settings');

    expect(normalizeReactHtml(result.appHtml)).toContain('User 7');
    expect(result.hydrationData.location.href).toBe('/users/7?tab=profile#settings');
    expect(result.html).toContain('window.__COOKBOOK_ROUTER__=');
  });

  it('hydrates from matching serialized state without mismatch errors', async () => {
    const staticRouter = createTrialStaticRouter('/blog/ssr-post', { authenticated: true });
    await staticRouter.resolveCurrent();
    const hydrationData = serializeRouterState(staticRouter);

    window.history.replaceState(null, '', hydrationData.location.href);

    const clientRouter = createTrialRouter({ hydrationData, authenticated: true });

    expect(clientRouter.state.error).toBeUndefined();
    expect(clientRouter.state.location.href).toBe('/blog/ssr-post');
    expect(normalizeReactHtml(renderToString(<App router={clientRouter} />))).toContain(
      'Full blog post ssr-post',
    );
  });
});
