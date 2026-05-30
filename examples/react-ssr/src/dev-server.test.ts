import { describe, expect, it, vi } from 'vitest';
import type { Plugin } from 'vite';
import { createReactSsrDevPlugin } from './dev-server';

interface MockRequest {
  readonly method: string;
  readonly url: string;
  readonly headers: { readonly accept: string };
}

interface MockResponse {
  statusCode: number;
  setHeader: (name: string, value: string) => void;
  end: (body?: string) => void;
}

type MockMiddleware = (
  request: MockRequest,
  response: MockResponse,
  next: (error?: unknown) => void,
) => Promise<void>;

interface MockServer {
  readonly middlewares: { readonly use: (handler: MockMiddleware) => void };
  readonly ssrLoadModule: (id: string) => Promise<unknown>;
  readonly transformIndexHtml: (url: string, html: string) => Promise<string>;
  readonly ssrFixStacktrace: (error: Error) => void;
}

function configurePlugin(plugin: Plugin, server: MockServer) {
  const configureServer = plugin.configureServer as unknown as (server: MockServer) => void;
  configureServer(server);
}

describe('react-ssr dev server', () => {
  it('serves SSR HTML for browser document requests in Vite dev mode', async () => {
    const renderRequest = vi.fn(
      async (url: string) => `<html><body><div id="root">SSR:${url}</div></body></html>`,
    );
    const transformIndexHtml = vi.fn(
      async (_url: string, html: string) => `${html}<!-- vite-dev -->`,
    );
    let middleware: MockMiddleware | undefined;

    const plugin = createReactSsrDevPlugin();
    configurePlugin(plugin, {
      middlewares: {
        use: (handler) => {
          middleware = handler;
        },
      },
      ssrLoadModule: vi.fn(async () => ({ renderRequest })),
      transformIndexHtml,
      ssrFixStacktrace: vi.fn(),
    });

    const headers = new Map<string, string>();
    let body = '';

    await middleware?.(
      {
        method: 'GET',
        url: '/articles/typed-routing?preview=true',
        headers: { accept: 'text/html,application/xhtml+xml' },
      },
      {
        statusCode: 0,
        setHeader: (name, value) => headers.set(name, value),
        end: (value = '') => {
          body = value;
        },
      },
      (error?: unknown) => {
        throw error ?? new Error('Expected the SSR middleware to handle the request.');
      },
    );

    expect(renderRequest).toHaveBeenCalledWith('/articles/typed-routing?preview=true');
    expect(transformIndexHtml).toHaveBeenCalled();
    expect(headers.get('Content-Type')).toBe('text/html; charset=utf-8');
    expect(body).toContain('SSR:/articles/typed-routing?preview=true');
    expect(body).toContain('vite-dev');
  });

  it('passes asset requests to Vite instead of rendering SSR HTML', async () => {
    let middleware: MockMiddleware | undefined;
    const next = vi.fn();

    const plugin = createReactSsrDevPlugin();
    configurePlugin(plugin, {
      middlewares: {
        use: (handler) => {
          middleware = handler;
        },
      },
      ssrLoadModule: vi.fn(),
      transformIndexHtml: vi.fn(),
      ssrFixStacktrace: vi.fn(),
    });

    await middleware?.(
      {
        method: 'GET',
        url: '/src/main.tsx',
        headers: { accept: '*/*' },
      },
      {
        statusCode: 0,
        setHeader: () => undefined,
        end: () => undefined,
      },
      next,
    );

    expect(next).toHaveBeenCalledOnce();
  });
});
