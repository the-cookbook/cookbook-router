import { afterEach, describe, expect, it } from 'vitest';
import {
  createPathConstraint,
  registerPathConstraints,
  resetPathConstraints,
} from '../path/constraints';
import type { NormalizedRoute } from '../route-config/contracts';
import { createRouteUrlContract } from './create-route-url-contract';
import { createRouteUrlContractStore } from './route-url-contract-store';

function normalizedRoute(id: string, path: string): NormalizedRoute {
  const route = { id, path };

  return {
    id,
    fullPath: path,
    localPath: path,
    children: [],
    params: [],
    index: false,
    score: 0,
    pathDepth: 0,
    order: 0,
    route,
    slotRoute: false,
    intercepts: [],
  } as NormalizedRoute;
}

const route = normalizedRoute('users.show', '/users/{id:int}');

afterEach(() => {
  resetPathConstraints();
});

describe('route URL contract store', () => {
  it('lazily compiles and reuses one contract per normalized route', () => {
    const store = createRouteUrlContractStore();
    const first = store.get(route);
    const second = store.get(route);

    expect(second).toBe(first);
    expect(first.parsePathname('/users/42')).toEqual({ id: 42 });
  });

  it('uses seeded validation contracts before lazy compilation', () => {
    const contract = createRouteUrlContract({ path: '/users/{id:int}' });
    const contracts = new WeakMap([[route.route, contract]]);
    const store = createRouteUrlContractStore({ contracts });

    expect(store.get(route)).toBe(contract);
    expect(store.get(route)).toBe(contract);
  });

  it('passes router URL options into lazy contract compilation', () => {
    const caseRoute = normalizedRoute('users.case', '/Users/{name}');

    const store = createRouteUrlContractStore({ routerUrl: { pathMatch: { sensitive: true } } });
    const contract = store.get(caseRoute);

    expect(contract.match('/Users/Ada')).toBe(true);
    expect(contract.match('/users/Ada')).toBe(false);
  });

  it('passes path constraints into lazy contract compilation', () => {
    const slug = createPathConstraint({
      parse(paramName, value) {
        if (typeof value !== 'string' || !/^[a-z-]+$/.test(value)) {
          throw new Error(`Parameter "${paramName}" must be a slug.`);
        }
      },
      verify() {},
      toRegExp() {
        return '[a-z-]+';
      },
    });
    const postRoute = normalizedRoute('posts.show', '/posts/{slug:store_slug}');

    const store = createRouteUrlContractStore({ pathConstraints: { store_slug: slug } });

    expect(store.get(postRoute).parsePathname('/posts/hello-world')).toEqual({
      slug: 'hello-world',
    });
    expect(store.get(postRoute).match('/posts/HelloWorld')).toBe(false);
  });

  it('keeps compiled contracts stable after global constraint replacement', () => {
    const digits = createPathConstraint({
      parse(paramName, value) {
        if (typeof value !== 'string' || !/^\d+$/.test(value)) {
          throw new Error(`Parameter "${paramName}" must contain only digits.`);
        }
      },
      verify() {},
      toRegExp() {
        return '\\d+';
      },
    });
    const letters = createPathConstraint({
      parse(paramName, value) {
        if (typeof value !== 'string' || !/^[a-z]+$/i.test(value)) {
          throw new Error(`Parameter "${paramName}" must contain only letters.`);
        }
      },
      verify() {},
      toRegExp() {
        return '[a-z]+';
      },
    });
    const postRoute = normalizedRoute('posts.show', '/posts/{slug:stable_slug}');

    const store = createRouteUrlContractStore({ pathConstraints: { stable_slug: digits } });
    const compiled = store.get(postRoute);

    registerPathConstraints({ stable_slug: letters });

    expect(store.get(postRoute)).toBe(compiled);
    expect(compiled.match('/posts/123')).toBe(true);
    expect(compiled.match('/posts/abc')).toBe(false);
    expect(
      createRouteUrlContractStore({ pathConstraints: { stable_slug: letters } })
        .get(postRoute)
        .match('/posts/abc'),
    ).toBe(true);
  });
});
