import Ajv, { type ValidateFunction } from 'ajv';
import type { RouterCliConfig } from '../contracts';
import type { RouterPathConstraint } from '@cookbook/router';

const ajv = new Ajv();

ajv.addKeyword({
  keyword: 'routerPathConstraint',
  validate(_schema: boolean, value: RouterPathConstraint): value is RouterPathConstraint {
    return (
      typeof value === 'function' &&
      typeof value.verify === 'function' &&
      typeof value.toRegExp === 'function'
    );
  },
});

const schema = {
  type: 'object',
  properties: {
    routeFiles: {
      anyOf: [
        { type: 'string' },
        {
          type: 'array',
          minItems: 2,
          uniqueItems: true,
          items: { type: 'string' },
        },
      ],
    },

    outDir: {
      type: 'string',
    },

    pathOptions: {
      type: 'object',
      properties: {
        prune: {
          enum: ['all', 'duplication', 'trailing', false],
        },
      },
      required: [],
      additionalProperties: false,
    },

    pathConstraints: {
      type: 'object',
      additionalProperties: {
        routerPathConstraint: true,
      },
    },
  },
  required: [],
  additionalProperties: false,
} as const;

const validate: ValidateFunction<RouterCliConfig> = ajv.compile(schema);

/**
 * Defines cookbook-router CLI configuration while preserving literal values.
 */
export function defineRouterConfig<const Config extends RouterCliConfig>(config: Config): Config {
  const valid = validate(config);

  if (!valid) {
    throw new Error(ajv.errorsText(validate.errors));
  }

  return config;
}
