import type { Plugin, ViteDevServer } from 'vite';

interface DevRenderModule {
  readonly renderRequest: (url: string) => Promise<string> | string;
}

export function createReactSsrDevPlugin(): Plugin {
  return {
    name: 'cookbook-router-react-ssr-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (!isDocumentRequest(request)) {
          next();
          return;
        }

        const url = request.url ?? '/';

        try {
          const { renderRequest } = await loadRenderModule(server);
          const html = await renderRequest(url);
          const transformedHtml = await server.transformIndexHtml(url, html);

          response.statusCode = 200;
          response.setHeader('Content-Type', 'text/html; charset=utf-8');

          if (request.method === 'HEAD') {
            response.end();
            return;
          }

          response.end(transformedHtml);
        } catch (error) {
          server.ssrFixStacktrace(error as Error);
          next(error);
        }
      });
    },
  };
}

function isDocumentRequest(request: {
  readonly method?: string | undefined;
  readonly url?: string | undefined;
  readonly headers: { readonly accept?: string | readonly string[] | undefined };
}) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return false;
  }

  if (!request.url) {
    return false;
  }

  const acceptHeader = request.headers.accept ?? '';
  const accept = Array.isArray(acceptHeader) ? acceptHeader.join(',') : acceptHeader;
  if (!accept.includes('text/html')) {
    return false;
  }

  const pathname = request.url.split('?')[0] ?? '/';
  if (
    pathname.startsWith('/@') ||
    pathname.startsWith('/src/') ||
    pathname.startsWith('/node_modules/')
  ) {
    return false;
  }

  return !/\.[a-zA-Z0-9]+$/.test(pathname);
}

async function loadRenderModule(server: ViteDevServer) {
  const module = (await server.ssrLoadModule('/src/server.tsx')) as Partial<DevRenderModule>;

  if (typeof module.renderRequest !== 'function') {
    throw new Error('The SSR dev server expected /src/server.tsx to export renderRequest().');
  }

  return module as DevRenderModule;
}
