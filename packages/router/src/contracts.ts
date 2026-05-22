export interface Register {}

export interface RouterContracts {
  params?: Record<string, Record<string, unknown>>;
  search?: Record<string, Record<string, unknown>>;
  hash?: Record<string, string | never>;
  meta?: Record<string, Record<string, unknown>>;
  paths?: Record<string, string>;
  outletContext?: Record<string, unknown>;
}

export type RegisteredContracts = Register extends {
  contracts: infer Contracts;
}
  ? Contracts
  : RouterContracts;

export type NoInferRoute<T> = [T][T extends unknown ? 0 : never];

export type RouteId = RegisteredContracts extends {
  paths: infer Paths;
}
  ? keyof Paths & string
  : string;

export type RouteParams<Route extends string> = RegisteredContracts extends {
  params: infer Params;
}
  ? Route extends keyof Params
    ? Params[Route]
    : Record<string, unknown>
  : Record<string, unknown>;

export type RouteSearch<Route extends string> = RegisteredContracts extends {
  search: infer Search;
}
  ? Route extends keyof Search
    ? Search[Route]
    : Record<string, unknown>
  : Record<string, unknown>;

export type RouteHash<Route extends string> = RegisteredContracts extends {
  hash: infer Hash;
}
  ? Route extends keyof Hash
    ? Hash[Route]
    : string | null
  : string | null;

export type RouteHashInput<Route extends string> =
  RouteHash<Route> extends never
    ? never
    : RouteHash<Route> | null | (RouteHash<Route> extends string ? `#${RouteHash<Route>}` : never);

export type RouteMeta<Route extends string> = RegisteredContracts extends {
  meta: infer Meta;
}
  ? Route extends keyof Meta
    ? Meta[Route]
    : Record<string, unknown>
  : Record<string, unknown>;

export type RouteOutletContext<Route extends string> = RegisteredContracts extends {
  outletContext: infer OutletContext;
}
  ? Route extends keyof OutletContext
    ? OutletContext[Route]
    : unknown
  : unknown;

export interface RouteUrlOptions<Route extends string> {
  readonly params?: RouteParams<Route>;
  readonly search?: RouteSearch<Route>;
  readonly hash?: RouteHashInput<Route>;
}

export interface RouteNavigationOptions<Route extends string> extends RouteUrlOptions<Route> {
  readonly replace?: boolean;
}
