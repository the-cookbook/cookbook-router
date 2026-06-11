import { describe, expect, it } from 'vitest';
import { normalizeActiveHref, resolveNavLinkState } from './resolve-nav-link-state';

describe('resolveNavLinkState', () => {
  it('marks exact and prefix route hrefs active', () => {
    expect(
      resolveNavLinkState('/settings/profile', '/settings/profile', '/settings', false),
    ).toEqual({
      isActive: true,
    });
    expect(
      resolveNavLinkState('/settings/profile', '/settings/profile', '/settings', true),
    ).toEqual({
      isActive: false,
    });
  });

  it('can ignore search while preserving hash comparison', () => {
    expect(
      resolveNavLinkState('/items?sort=new#top', '/items', '/items?sort=old#top', {
        search: 'ignore',
      }),
    ).toEqual({ isActive: true });
  });

  it('normalizes same-origin absolute hrefs', () => {
    expect(normalizeActiveHref(`${window.location.origin}/settings?tab=a#top`)).toBe(
      '/settings?tab=a#top',
    );
  });
});
