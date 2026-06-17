import {
  parsePathPattern,
  type ParsedPathLiteralSegment,
  type ParsedPathParamConstraint,
  type ParsedPathParamSegment,
  type ParsedPathSegment,
} from '@cookbook/urlkit/router-runtime';
import type { RouteParamConstraint, RouteParamDefinition } from '../route-config/contracts';

export interface AnalyzedPathPattern {
  readonly params: readonly RouteParamDefinition[];
  readonly score: number;
  readonly depth: number;
}

export function analyzePathPattern(pattern: string): AnalyzedPathPattern {
  const segments = parsePathPattern(pattern);
  const params: RouteParamDefinition[] = [];
  let score = 0;
  let depth = 0;

  for (const segment of segments) {
    depth += 1;

    if (isLiteralSegment(segment)) {
      score += 5;
      continue;
    }

    const wildcard = segment.wildcard === true;
    const constraints = freezeConstraints(segment.constraints ?? []);

    score += wildcard ? 1 : 3;
    params.push(
      Object.freeze({
        name: segment.name,
        constraints,
        wildcard,
        optional: segment.optional === true,
        token: createParamToken(segment, constraints),
      }),
    );
  }

  return Object.freeze({
    params: Object.freeze(params),
    score,
    depth,
  });
}

function isLiteralSegment(segment: ParsedPathSegment): segment is ParsedPathLiteralSegment {
  return segment.type === 'literal';
}

function freezeConstraints(
  constraints: readonly ParsedPathParamConstraint[],
): readonly RouteParamConstraint[] {
  return Object.freeze(
    constraints.map((constraint) =>
      Object.freeze({
        type: constraint.type,
        params: constraint.params,
      }),
    ),
  );
}

function createParamToken(
  segment: ParsedPathParamSegment,
  constraints: readonly RouteParamConstraint[],
): string {
  const prefix = segment.wildcard === true ? '*' : '';
  const suffix = segment.optional === true ? '?' : '';
  const chain = constraints
    .map((constraint) => {
      const params = constraint.params ? `(${constraint.params})` : '';
      return `:${constraint.type}${params}`;
    })
    .join('');

  return `{${prefix}${segment.name}${chain}${suffix}}`;
}
