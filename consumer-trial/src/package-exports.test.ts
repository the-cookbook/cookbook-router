import { describe, expect, it } from 'vitest';
import { createMemoryRouter, defineRoutes } from '@cookbook/router';
import { defineRoute } from '@cookbook/router/route-config';
import { createMemoryHistory } from '@cookbook/router/history';
import { matchRoutes } from '@cookbook/router/matching';
import { createMemoryRouter as createMemoryRouterFromRuntime } from '@cookbook/router/runtime';
import { createPathConstraint } from '@cookbook/router/path';
import { createRouteUrlContract } from '@cookbook/router/url-state';
import { renderRouteMatch } from '@cookbook/router/rendering';
import { createMissingPathError } from '@cookbook/router/diagnostics';
import { Link, RouterProvider, useNavigate } from '@cookbook/router-react';

describe('public package exports used by an external app', () => {
  it('provides all APIs used by the consumer trial from package roots', () => {
    expect(typeof defineRoutes).toBe('function');
    expect(typeof createMemoryRouter).toBe('function');
    expect(typeof Link).toBe('function');
    expect(typeof RouterProvider).toBe('function');
    expect(typeof useNavigate).toBe('function');
  });

  it('provides focused router subpath entry points', () => {
    expect(typeof defineRoute).toBe('function');
    expect(typeof createMemoryHistory).toBe('function');
    expect(typeof matchRoutes).toBe('function');
    expect(typeof createMemoryRouterFromRuntime).toBe('function');
    expect(typeof createPathConstraint).toBe('function');
    expect(typeof createRouteUrlContract).toBe('function');
    expect(typeof renderRouteMatch).toBe('function');
    expect(typeof createMissingPathError).toBe('function');
  });
});
