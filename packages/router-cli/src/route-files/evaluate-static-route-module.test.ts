import { describe, expect, it } from 'vitest';
import { evaluateStaticRouteModule } from './evaluate-static-route-module';

describe('evaluateStaticRouteModule', () => {
  it('evaluates sanitized route literals with placeholder views', () => {
    const routes = evaluateStaticRouteModule(
      'routes.ts',
      "[{ id: 'home', path: '/', view: __cookbookRouteView }]",
    );
    expect(routes).toEqual([{ id: 'home', path: '/', view: expect.any(Function) }]);
  });

  it('wraps evaluation errors', () => {
    expect(() => evaluateStaticRouteModule('routes.ts', '[broken')).toThrow(
      'could not be evaluated as a static route declaration',
    );
  });
});
