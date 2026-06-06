import { createRouteUrlContract } from '../url/create-route-url-contract';
import type { RouterPathConstraints } from '../pathkit/pathkit';
import type { RouteDefinition } from '../routes/contracts';
import type { RouterUrlOptions } from '../url/contracts';

interface ValidateRouteUrlDescriptorOptions {
  readonly route: RouteDefinition;
  readonly fullPath?: string;
  readonly routerUrl?: RouterUrlOptions;
  readonly pathConstraints?: RouterPathConstraints;
}

export function validateRouteUrlDescriptor(options: ValidateRouteUrlDescriptorOptions): void {
  validateCleanSearchDescriptor(options.route);
  validateCleanHashDescriptor(options.route);

  const hasUrlDescriptor =
    options.route.path !== undefined ||
    options.route.index === true ||
    options.route.search !== undefined ||
    options.route.hash !== undefined;

  if (!hasUrlDescriptor) {
    return;
  }

  createRouteUrlContract(
    {
      ...(options.fullPath === undefined ? {} : { path: options.fullPath }),
      ...(options.route.search === undefined ? {} : { search: options.route.search }),
      ...(options.route.hash === undefined ? {} : { hash: options.route.hash }),
      ...(options.route.url === undefined ? {} : { url: options.route.url }),
    },
    {
      routeId: options.route.id,
      ...(options.routerUrl === undefined ? {} : { routerUrl: options.routerUrl }),
      ...(options.pathConstraints === undefined
        ? {}
        : { pathConstraints: options.pathConstraints }),
    },
  );
}

function validateCleanSearchDescriptor(route: RouteDefinition): void {
  const search = route.search;

  if (search === undefined) {
    return;
  }

  if (!search || typeof search !== 'object' || Array.isArray(search)) {
    throw new Error(`Route "${route.id}" search configuration must be an object.`);
  }

  for (const [key, field] of Object.entries(search)) {
    validateCleanSearchField(route.id, key, field);
  }
}

function validateCleanSearchField(routeId: string, key: string, field: unknown): void {
  if (typeof field === 'string') {
    throw new Error(
      `Route "${routeId}" search param "${key}" uses removed shorthand. Use { type: "${field}" } instead.`,
    );
  }

  if (!isRecord(field)) {
    throw new Error(
      `Route "${routeId}" search param "${key}" must use a URLKit static search descriptor object.`,
    );
  }

  if (field.type === 'one' || field.type === 'many') {
    throw new Error(
      `Route "${routeId}" search param "${key}" uses removed cardinality type "${String(field.type)}". Use many: true for repeated params.`,
    );
  }

  if (Object.prototype.hasOwnProperty.call(field, 'value')) {
    throw new Error(
      `Route "${routeId}" search param "${key}" uses removed "value" descriptors. Move the "value" property to the field "type" property.`,
    );
  }

  validatePositiveLiteralFlag({
    routeId,
    subject: `search param "${key}"`,
    descriptor: field,
    flag: 'optional',
    falseMessage: `Route "${routeId}" search param "${key}" must omit optional instead of using optional: false.`,
  });

  validatePositiveLiteralFlag({
    routeId,
    subject: `search param "${key}"`,
    descriptor: field,
    flag: 'many',
    falseMessage: `Route "${routeId}" search param "${key}" must omit many instead of using many: false.`,
  });

  if (field.optional === true && Object.prototype.hasOwnProperty.call(field, 'default')) {
    throw new Error(
      `Route "${routeId}" search param "${key}" cannot combine optional: true with default.`,
    );
  }
}

function validateCleanHashDescriptor(route: RouteDefinition): void {
  const hash = route.hash;

  if (hash === undefined) {
    return;
  }

  if (Array.isArray(hash)) {
    throw new Error(
      `Route "${route.id}" hash uses removed array shorthand. Use { type: "enum", values: [...], optional: true } instead.`,
    );
  }

  if (!isRecord(hash)) {
    throw new Error(
      `Route "${route.id}" hash configuration must use a URLKit static hash descriptor.`,
    );
  }

  validatePositiveLiteralFlag({
    routeId: route.id,
    subject: 'hash',
    descriptor: hash,
    flag: 'optional',
    falseMessage: `Route "${route.id}" hash must omit optional instead of using optional: false.`,
  });

  validateHashLeadingSign(route.id, hash);

  if (hash.optional === true && Object.prototype.hasOwnProperty.call(hash, 'default')) {
    throw new Error(`Route "${route.id}" hash cannot combine optional: true with default.`);
  }
}

interface ValidatePositiveLiteralFlagOptions {
  readonly routeId: string;
  readonly subject: string;
  readonly descriptor: Record<string, unknown>;
  readonly flag: 'many' | 'optional';
  readonly falseMessage: string;
}

function validatePositiveLiteralFlag(options: ValidatePositiveLiteralFlagOptions): void {
  if (!Object.prototype.hasOwnProperty.call(options.descriptor, options.flag)) {
    return;
  }

  const value = options.descriptor[options.flag];

  if (value === true) {
    return;
  }

  if (value === false) {
    throw new Error(options.falseMessage);
  }

  throw new Error(
    `Route "${options.routeId}" ${options.subject} has an invalid URL descriptor. URLKit error: ${options.flag} must be literal true when provided.`,
  );
}

function validateHashLeadingSign(routeId: string, hash: Record<string, unknown>): void {
  if (typeof hash.default === 'string') {
    validateHashValueWithoutLeadingSign(routeId, hash.default);
  }

  if (!Array.isArray(hash.values)) {
    return;
  }

  for (const value of hash.values) {
    if (typeof value === 'string') {
      validateHashValueWithoutLeadingSign(routeId, value);
    }
  }
}

function validateHashValueWithoutLeadingSign(routeId: string, hash: string): void {
  if (!hash.startsWith('#')) {
    return;
  }

  throw new Error(`Route "${routeId}" hash value "${hash}" must not include a leading #.`);
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input);
}
