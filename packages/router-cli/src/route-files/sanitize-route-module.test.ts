import { describe, expect, it } from 'vitest';
import {
  assertNoUnsupportedRuntimeUrlKitBuilders,
  sanitizeRouteSlotShorthand,
  sanitizeRoutesLiteral,
} from './sanitize-route-module';

describe('sanitize-route-module', () => {
  it('replaces view-bearing route properties with placeholders', () => {
    expect(
      sanitizeRoutesLiteral(
        '[{ id: "home", view: HomePage, loading: Loading, middleware: [auth], preload: warmRoute }]',
      ),
    ).toBe(
      '[{ id: "home", view: __cookbookRouteView, loading: __cookbookRouteView, middleware: [], preload: undefined }]',
    );
  });

  it('keeps slot shorthand ergonomic while replacing non-static slot views', () => {
    expect(sanitizeRouteSlotShorthand('{ slots: { sidebar: SidebarView, modal: true } }')).toBe(
      '{ slots: { sidebar: __cookbookRouteView, modal: true } }',
    );
  });

  it('rejects runtime URLKit builders in static route files', () => {
    expect(() =>
      assertNoUnsupportedRuntimeUrlKitBuilders('routes.ts', '[{ search: { q: string() } }]'),
    ).toThrow('uses URLKit runtime builders');
  });
});
