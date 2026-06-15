import { compile, match, tokenize, validateRoute } from '@cookbook/pathkit';
import type { MatchedParam, RouteSegment } from '@cookbook/pathkit';
import type { RouteParamDefinition } from '../route-config/contracts';
import { setPathConstraintRegistry } from './constraints';

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

/** Controls PathKit matching for serialized path input. */
export interface RouterPathMatchOptions {
  /** Allows one final delimiter during matching. */
  readonly trailing?: boolean;
  /** Enables strict constraint errors instead of ordinary route misses. */
  readonly strict?: boolean;
  /** Enables case-sensitive matching. */
  readonly sensitive?: boolean;
  /** Reserved for prefix routing. */
  readonly end?: boolean;
  /** Controls whether wildcard captures are returned as strings or segments. */
  readonly wildcardFormat?: 'string' | 'array';
  /** Decodes matched path params with decodeURIComponent or a custom decoder. */
  readonly decode?: boolean | ((value: string) => string);
}

export type PathkitMatchedParams = Record<string, string | readonly string[]>;

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
const decoderIds = new WeakMap<(value: string) => string, number>();
let nextDecoderId = 0;
const compilers = new Map<string, ReturnType<typeof compile>>();
const tokens = new Map<string, readonly RouteSegment[]>();

function clearPathCaches(): void {
  matchers.clear();
  compilers.clear();
  tokens.clear();
}

setPathConstraintRegistry({ clearCaches: clearPathCaches });

/**
 * Validates a route path pattern against built-in and registered constraints.
 */
export function validatePathPattern(pattern: string, _options?: RouterPathOptions): void {
  validateRoute(pattern);
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
  options?: RouterPathOptions & RouterPathMatchOptions,
): PathkitMatchedParams | null {
  const normalizedOptions = normalizePathOptions(options);
  const matchOptions = normalizePathMatchOptions(options);
  const cacheKey = createPathkitCacheKey(pattern, normalizedOptions, matchOptions);
  let matcher = matchers.get(cacheKey);

  if (!matcher) {
    matcher = match(pattern, matchOptions);
    matchers.set(cacheKey, matcher);
  }

  const result = matcher(prunePathname(pathname, normalizedOptions));

  if (!result.match || !result.params) {
    return null;
  }

  return normalizeMatchedParams(result.params);
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

function normalizePathMatchOptions(options?: RouterPathMatchOptions): RouterPathMatchOptions {
  return {
    ...(options?.trailing === undefined ? {} : { trailing: options.trailing }),
    ...(options?.strict === undefined ? {} : { strict: options.strict }),
    ...(options?.sensitive === undefined ? {} : { sensitive: options.sensitive }),
    ...(options?.end === undefined ? {} : { end: options.end }),
    ...(options?.wildcardFormat === undefined ? {} : { wildcardFormat: options.wildcardFormat }),
    ...(options?.decode === undefined ? {} : { decode: options.decode }),
  };
}

function createPathkitCacheKey(
  pattern: string,
  options: Required<RouterPathOptions>,
  matchOptions: RouterPathMatchOptions = {},
): string {
  return [
    pattern,
    `prune=${String(options.prune)}`,
    `trailing=${String(matchOptions.trailing)}`,
    `strict=${String(matchOptions.strict)}`,
    `sensitive=${String(matchOptions.sensitive)}`,
    `end=${String(matchOptions.end)}`,
    `wildcardFormat=${String(matchOptions.wildcardFormat)}`,
    `decode=${getDecodeCacheKey(matchOptions.decode)}`,
  ].join('::');
}

function getDecodeCacheKey(decode: RouterPathMatchOptions['decode']): string {
  if (typeof decode !== 'function') {
    return String(decode);
  }

  const existing = decoderIds.get(decode);

  if (existing !== undefined) {
    return `fn:${existing}`;
  }

  const next = nextDecoderId++;
  decoderIds.set(decode, next);
  return `fn:${next}`;
}

function normalizeMatchedParams(params: MatchedParam): PathkitMatchedParams {
  const normalized: Record<string, string | readonly string[]> = {};

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }

    normalized[key] = Array.isArray(value) ? normalizeWildcardSegments(value) : String(value);
  }

  return normalized;
}

function normalizeWildcardSegments(value: readonly unknown[]): readonly string[] {
  const segments = value.map(String);

  if (segments[segments.length - 1] === '') {
    return segments.slice(0, -1);
  }

  return segments;
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
