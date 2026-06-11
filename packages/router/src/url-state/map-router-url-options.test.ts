import { describe, expect, it } from 'vitest';
import {
  toUrlKitBuildOptions,
  toUrlKitContractOptions,
  toUrlKitHashParseOptions,
  toUrlKitSearchParseOptions,
} from './map-router-url-options';

describe('map-router-url-options', () => {
  it('maps contract options without forwarding parse-only or build-only options', () => {
    expect(
      toUrlKitContractOptions({
        arrayFormat: 'comma',
        unknownSearch: 'preserve',
        invalidSearch: 'error',
        invalidHash: 'error',
        defaults: 'omit',
      }),
    ).toEqual({ arrayFormat: 'comma', unknownSearch: 'preserve' });
  });

  it('maps recover and omitted search policies to URLKit omit recovery', () => {
    expect(toUrlKitSearchParseOptions({})).toEqual({ invalidSearch: 'omit' });
    expect(toUrlKitSearchParseOptions({ invalidSearch: 'recover' })).toEqual({
      invalidSearch: 'omit',
    });
  });

  it('maps strict and no-match search policies to URLKit errors', () => {
    expect(toUrlKitSearchParseOptions({ invalidSearch: 'error' })).toEqual({
      invalidSearch: 'error',
    });
    expect(toUrlKitSearchParseOptions({ invalidSearch: 'no-match' })).toEqual({
      invalidSearch: 'error',
    });
  });

  it('forwards array and unknown search options while mapping search recovery', () => {
    expect(
      toUrlKitSearchParseOptions({
        arrayFormat: 'comma',
        unknownSearch: 'strip',
        invalidSearch: 'recover',
      }),
    ).toEqual({ arrayFormat: 'comma', unknownSearch: 'strip', invalidSearch: 'omit' });
  });

  it('maps hash recovery policies to URLKit hash options', () => {
    expect(toUrlKitHashParseOptions({})).toEqual({ invalidHash: 'omit' });
    expect(toUrlKitHashParseOptions({ invalidHash: 'recover' })).toEqual({
      invalidHash: 'omit',
    });
    expect(toUrlKitHashParseOptions({ invalidHash: 'error' })).toEqual({
      invalidHash: 'error',
    });
    expect(toUrlKitHashParseOptions({ invalidHash: 'no-match' })).toEqual({
      invalidHash: 'error',
    });
  });

  it('maps build options without forwarding parse-only options', () => {
    expect(
      toUrlKitBuildOptions({
        arrayFormat: 'repeat',
        defaults: 'omit',
        unknownSearch: 'error',
        invalidSearch: 'recover',
        invalidHash: 'recover',
      }),
    ).toEqual({ arrayFormat: 'repeat', defaults: 'omit' });
  });
});
