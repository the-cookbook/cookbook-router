import type {
  RouterInvalidUrlStatePolicy,
  RouterPathMatchOptions,
  RouterUrlBuildOptions,
  RouterUrlOptions,
} from './contracts';

export interface UrlKitContractOptions {
  readonly arrayFormat?: NonNullable<RouterUrlOptions['arrayFormat']>;
  readonly unknownSearch?: NonNullable<RouterUrlOptions['unknownSearch']>;
  readonly pathMatch?: RouterPathMatchOptions;
}

export interface UrlKitSearchParseOptions extends RouterPathMatchOptions {
  readonly arrayFormat?: NonNullable<RouterUrlOptions['arrayFormat']>;
  readonly unknownSearch?: NonNullable<RouterUrlOptions['unknownSearch']>;
  readonly invalidSearch?: 'error' | 'omit';
}

export interface UrlKitHashParseOptions {
  readonly invalidHash?: 'error' | 'omit';
}

export function toUrlKitContractOptions(options: RouterUrlOptions): UrlKitContractOptions {
  assertSupportedRouterPathMatchOptions(options.pathMatch);

  return {
    ...(options.arrayFormat === undefined ? {} : { arrayFormat: options.arrayFormat }),
    ...(options.unknownSearch === undefined ? {} : { unknownSearch: options.unknownSearch }),
    ...(options.pathMatch === undefined ? {} : { pathMatch: options.pathMatch }),
  };
}

export function toUrlKitSearchParseOptions(options: RouterUrlOptions): UrlKitSearchParseOptions {
  assertSupportedRouterPathMatchOptions(options.pathMatch);

  return {
    ...(options.arrayFormat === undefined ? {} : { arrayFormat: options.arrayFormat }),
    ...(options.unknownSearch === undefined ? {} : { unknownSearch: options.unknownSearch }),
    ...(options.pathMatch === undefined ? {} : options.pathMatch),
    ...toUrlKitInvalidSearchOption(options.invalidSearch),
  };
}

export function toUrlKitPathMatchOptions(options: RouterUrlOptions): RouterPathMatchOptions {
  assertSupportedRouterPathMatchOptions(options.pathMatch);
  return options.pathMatch ?? {};
}

export function toUrlKitHashParseOptions(options: RouterUrlOptions): UrlKitHashParseOptions {
  return toUrlKitInvalidHashOption(options.invalidHash);
}

export function toUrlKitBuildOptions(options: RouterUrlOptions): RouterUrlBuildOptions {
  return {
    ...(options.arrayFormat === undefined ? {} : { arrayFormat: options.arrayFormat }),
    ...(options.defaults === undefined ? {} : { defaults: options.defaults }),
  };
}

export function assertSupportedRouterPathMatchOptions(
  pathMatch: RouterUrlOptions['pathMatch'],
): void {
  if (pathMatch?.end === false) {
    throw new Error(
      'Router url.pathMatch.end: false is not supported yet. Prefix matching requires route match state to expose consumed and remaining pathnames.',
    );
  }
}

function toUrlKitInvalidSearchOption(
  policy: RouterInvalidUrlStatePolicy | undefined,
): Pick<UrlKitSearchParseOptions, 'invalidSearch'> {
  if (policy === undefined || policy === 'recover') {
    return { invalidSearch: 'omit' };
  }

  if (policy === 'error' || policy === 'no-match') {
    return { invalidSearch: 'error' };
  }

  return {};
}

function toUrlKitInvalidHashOption(
  policy: RouterInvalidUrlStatePolicy | undefined,
): UrlKitHashParseOptions {
  if (policy === undefined || policy === 'recover') {
    return { invalidHash: 'omit' };
  }

  if (policy === 'error' || policy === 'no-match') {
    return { invalidHash: 'error' };
  }

  return {};
}
