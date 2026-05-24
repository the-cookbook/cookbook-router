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

export { hasConstraint, getConstraint, unregisterConstraint, createConstraint };

export type PathPruneOption = 'all' | 'duplication' | 'trailing' | false;

export interface RouterPathOptions {
  readonly prune?: PathPruneOption;
}

export type RouterPathConstraint = ConstraintValidation;
export type RouterPathConstraints = Readonly<Record<string, RouterPathConstraint>>;

export const DEFAULT_PATH_OPTIONS: Required<RouterPathOptions> = {
  prune: 'all',
};

export type PathkitCompileParams = Record<
  string,
  string | number | boolean | (string | number | boolean)[] | null | undefined
>;

const matchers = new Map<string, ReturnType<typeof match>>();
const compilers = new Map<string, ReturnType<typeof compile>>();
const tokens = new Map<string, readonly RouteSegment[]>();

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

export function validatePathPattern(pattern: string, options?: RouterPathOptions): void {
  (validateRoute as (pattern: string, options?: Required<RouterPathOptions>) => void)(
    pattern,
    normalizePathOptions(options),
  );
}

export function getPathTokens(pattern: string): readonly RouteSegment[] {
  const cached = tokens.get(pattern);

  if (cached) {
    return cached;
  }

  const parsed = tokenize(pattern);
  tokens.set(pattern, parsed);
  return parsed;
}

export function getPathParams(pattern: string): readonly RouteParamDefinition[] {
  return getPathTokens(pattern)
    .filter(
      (segment): segment is Extract<RouteSegment, { readonly type: 'parameter' }> =>
        segment.type === 'parameter',
    )
    .map((segment) => ({
      name: segment.name,
      constraint: segment.wildcard ? 'wildcard' : (segment.constraints[0]?.type ?? 'string'),
      token: segmentToToken(segment),
    }));
}

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

export function normalizePathOptions(options?: RouterPathOptions): Required<RouterPathOptions> {
  return {
    prune: options?.prune ?? DEFAULT_PATH_OPTIONS.prune,
  };
}

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

  return `{${prefix}${segment.name}${suffix}${constraints.join('')}}`;
}
