import type {
  RouterInvalidUrlStatePolicy,
  RouterUrlBuildOptions,
  RouterUrlOptions,
} from './contracts';

export interface UrlKitContractOptions {
  readonly arrayFormat?: NonNullable<RouterUrlOptions['arrayFormat']>;
  readonly unknownSearch?: NonNullable<RouterUrlOptions['unknownSearch']>;
}

export interface UrlKitSearchParseOptions extends UrlKitContractOptions {
  readonly invalidSearch?: 'error' | 'omit';
}

export interface UrlKitHashParseOptions {
  readonly invalidHash?: 'error' | 'omit';
}

export function toUrlKitContractOptions(options: RouterUrlOptions): UrlKitContractOptions {
  return {
    ...(options.arrayFormat === undefined ? {} : { arrayFormat: options.arrayFormat }),
    ...(options.unknownSearch === undefined ? {} : { unknownSearch: options.unknownSearch }),
  };
}

export function toUrlKitSearchParseOptions(options: RouterUrlOptions): UrlKitSearchParseOptions {
  return {
    ...toUrlKitContractOptions(options),
    ...toUrlKitInvalidSearchOption(options.invalidSearch),
  };
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
