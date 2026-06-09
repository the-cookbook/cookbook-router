import {
  compile,
  match,
  hasConstraint,
  getConstraint,
  unregisterConstraint,
  createConstraint,
  registerConstraint,
  tokenize,
  validateRoute,
} from '@cookbook/pathkit';
import type { ConstraintValidation, MatchedParam, RouteSegment } from '@cookbook/pathkit';
import type { RouteParamDefinition } from '../routes/contracts';

/**
 * Re-exported path constraint helpers from `@cookbook/pathkit`.
 *
 * Use `createConstraint` to author custom constraints, `hasConstraint` and
 * `getConstraint` for diagnostics, and `unregisterConstraint` in tests that need
 * to isolate global constraint registration.
 */
export { hasConstraint, getConstraint, unregisterConstraint, createConstraint };

/**
 * Path pruning mode applied during validation, matching, and href compilation.
 *
 * `all` removes duplicate and trailing slashes, `duplication` removes only
 * repeated slashes, `trailing` removes only trailing slashes, and `false`
 * preserves authored pathnames.
 */
export type PathPruneOption = 'all' | 'duplication' | 'trailing' | false;

/**
 * Router path options forwarded to path validation, matching, and compilation.
 */
export interface RouterPathOptions {
  readonly prune?: PathPruneOption;
}

/**
 * Validation contract for a custom path constraint.
 */
export type RouterPathConstraint = ConstraintValidation;
/**
 * Custom path constraints keyed by constraint name.
 */
export type RouterPathConstraints = Readonly<Record<string, RouterPathConstraint>>;

export const DEFAULT_PATH_OPTIONS: Required<RouterPathOptions> = {
  prune: 'all',
};

/**
 * Values accepted by path compilation for named route parameters.
 *
 * Missing required params or params that fail their constraint throw during href
 * generation. Catch-all params may be provided as a slash-delimited string or an
 * array of primitive segments.
 */
export type PathkitCompileParams = Record<
  string,
  string | number | boolean | (string | number | boolean)[] | null | undefined
>;

const matchers = new Map<string, ReturnType<typeof match>>();
const compilers = new Map<string, ReturnType<typeof compile>>();
const tokens = new Map<string, readonly RouteSegment[]>();

/**
 * Registers custom constraints with the underlying pathkit registry.
 *
 * Registration is global to the process, so tests that define temporary
 * constraints should unregister or isolate names. Caches are cleared after
 * registration so validation, matching, and compilation see the new behavior.
 */
export function registerPathConstraints(constraints?: RouterPathConstraints): void {
  if (!constraints) {
    return;
  }

  for (const [name, constraint] of Object.entries(constraints)) {
    if (!name.trim()) {
      throw new Error('Router path constraint names must be non-empty strings.');
    }

    registerConstraint(name, constraint);
  }

  clearPathkitCaches();
}

function clearPathkitCaches(): void {
  matchers.clear();
  compilers.clear();
  tokens.clear();
}

/**
 * Validates a route path pattern against built-in and registered constraints.
 */
export function validatePathPattern(pattern: string, options?: RouterPathOptions): void {
  (validateRoute as (pattern: string, options?: Required<RouterPathOptions>) => void)(
    pattern,
    normalizePathOptions(options),
  );
}

/**
 * Tokenizes and caches a route path pattern.
 */
export function getPathTokens(pattern: string): readonly RouteSegment[] {
  const cached = tokens.get(pattern);

  if (cached) {
    return cached;
  }

  const parsed = tokenize(pattern);
  tokens.set(pattern, parsed);
  return parsed;
}

/**
 * Extracts normalized parameter definitions from a route path pattern.
 */
export function getPathParams(pattern: string): readonly RouteParamDefinition[] {
  return getPathTokens(pattern)
    .filter(
      (segment): segment is Extract<RouteSegment, { readonly type: 'parameter' }> =>
        segment.type === 'parameter',
    )
    .map((segment) => ({
      name: segment.name,
      constraints: segment.constraints.map((constraint) => ({
        type: constraint.type,
        params: constraint.params,
      })),
      wildcard: segment.wildcard,
      optional: segment.optional,
      token: segmentToToken(segment),
    }));
}

/**
 * Matches a pathname against a route pattern and returns raw string params.
 */
export function matchPathPattern(
  pattern: string,
  pathname: string,
  options?: RouterPathOptions,
): Record<string, string> | null {
  const normalizedOptions = normalizePathOptions(options);
  const cacheKey = createPathkitCacheKey(pattern, normalizedOptions);
  let matcher = matchers.get(cacheKey);

  if (!matcher) {
    matcher = (
      match as (pattern: string, options?: Required<RouterPathOptions>) => ReturnType<typeof match>
    )(pattern, normalizedOptions);
    matchers.set(cacheKey, matcher);
  }

  const result = matcher(pathname);

  if (!result.match || !result.params) {
    return null;
  }

  return normalizeMatchedParams(pattern, result.params);
}

/**
 * Compiles a route pattern and params into a pathname.
 *
 * Required params and constraint failures throw before navigation occurs.
 */
export function compilePathPattern(
  pattern: string,
  params?: PathkitCompileParams,
  options?: RouterPathOptions,
): string {
  const normalizedOptions = normalizePathOptions(options);
  const cacheKey = createPathkitCacheKey(pattern, normalizedOptions);
  let compiler = compilers.get(cacheKey);

  if (!compiler) {
    compiler = (
      compile as (
        pattern: string,
        options?: Required<RouterPathOptions>,
      ) => ReturnType<typeof compile>
    )(pattern, normalizedOptions);
    compilers.set(cacheKey, compiler);
  }

  return compiler(params);
}

/** Normalizes partial path options to router defaults. */
export function normalizePathOptions(options?: RouterPathOptions): Required<RouterPathOptions> {
  return {
    prune: options?.prune ?? DEFAULT_PATH_OPTIONS.prune,
  };
}

/** Applies configured slash pruning to a pathname. */
export function prunePathname(pathname: string, options?: RouterPathOptions): string {
  const prune = normalizePathOptions(options).prune;
  let next = pathname || '/';

  if (prune === 'all' || prune === 'duplication') {
    next = next.replace(/\/{2,}/g, '/');
  }

  if (prune === 'all' || prune === 'trailing') {
    next = next.length > 1 ? next.replace(/\/+$/g, '') : next;
  }

  return next || '/';
}

function createPathkitCacheKey(pattern: string, options: Required<RouterPathOptions>): string {
  return `${pattern}::prune=${String(options.prune)}`;
}

function normalizeMatchedParams(_pattern: string, params: MatchedParam): Record<string, string> {
  const normalized: Record<string, string> = {};

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }

    normalized[key] = Array.isArray(value) ? value.join('/') : String(value);
  }

  return normalized;
}

function segmentToToken(segment: Extract<RouteSegment, { readonly type: 'parameter' }>): string {
  const prefix = segment.wildcard ? '*' : '';
  const suffix = segment.optional ? '?' : '';
  const constraints = segment.constraints.map((constraint) => {
    const params = constraint.params ? `(${constraint.params})` : '';
    return `:${constraint.type}${params}`;
  });

  return `{${prefix}${segment.name}${constraints.join('')}${suffix}}`;
}
