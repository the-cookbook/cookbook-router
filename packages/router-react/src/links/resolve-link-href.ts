import type { HrefOptions, InterceptInput, RouteId } from '@cookbook/router';

export interface ResolveLinkHrefOptionsInput<Route extends RouteId> {
  readonly params?: HrefOptions<Route>['params'] | undefined;
  readonly search?: HrefOptions<Route>['search'] | undefined;
  readonly hash?: HrefOptions<Route>['hash'] | undefined;
  readonly url?: HrefOptions<Route>['url'] | undefined;
  readonly intercept?: false | InterceptInput | undefined;
  readonly context?: HrefOptions<Route>['context'] | undefined;
  readonly preventScrollReset?: boolean | undefined;
}

/**
 * Builds the shared route href/navigation options used by React link components.
 */
export function resolveLinkHrefOptions<Route extends RouteId>(
  input: ResolveLinkHrefOptionsInput<Route>,
): HrefOptions<Route> {
  return {
    ...(input.params === undefined ? {} : { params: input.params }),
    ...(input.search === undefined ? {} : { search: input.search }),
    ...(input.hash === undefined ? {} : { hash: input.hash }),
    ...(input.url === undefined ? {} : { url: input.url }),
    ...(input.intercept === undefined ? {} : { intercept: input.intercept }),
    ...(input.context === undefined ? {} : { context: input.context }),
    ...(input.preventScrollReset === undefined
      ? {}
      : { preventScrollReset: input.preventScrollReset }),
  } as HrefOptions<Route>;
}
