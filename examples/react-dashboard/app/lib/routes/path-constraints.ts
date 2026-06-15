import { createPathConstraint } from '@cookbook/router';

export const pathConstraints = {
  slug: createPathConstraint({
    parse: (paramName, value) => {
      if (typeof value !== 'string') {
        throw new Error(`Parameter "${paramName}" must be a string`);
      }

      if (!/^[a-z0-9-]+$/.test(value)) {
        throw new Error(`Parameter "${paramName}" must be a valid slug`);
      }
    },

    verify: (paramName, params) => {
      if (params.trim().length) {
        throw new Error(
          `[Constraint] Constraint 'slug' declared for '${paramName}' does not accept parameters, ` +
            `but received '${params}'.`
        );
      }
    },

    toRegExp: () => '[a-z0-9-]+',
  }),
};
