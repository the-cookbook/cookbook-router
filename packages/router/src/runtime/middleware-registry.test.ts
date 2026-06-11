import { describe, expect, it } from 'vitest';
import type { Middleware } from '../route-config/contracts';
import { createRuntimeMiddlewareRegistry } from './middleware-registry';

describe('createRuntimeMiddlewareRegistry', () => {
  it('combines static middleware with runtime middleware until cleanup', () => {
    const base: Middleware = () => undefined;
    const added: Middleware = () => undefined;
    const registry = createRuntimeMiddlewareRegistry([base]);

    expect(registry.getActiveMiddleware()).toEqual([base]);

    const cleanup = registry.useMiddleware([added]);

    expect(registry.getActiveMiddleware()).toEqual([base, added]);

    cleanup();

    expect(registry.getActiveMiddleware()).toEqual([base]);
  });
});
