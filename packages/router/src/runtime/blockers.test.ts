import { describe, expect, it } from 'vitest';
import { parseHref } from '../history/memory-history';
import { createNavigationBlockerRegistry, runNavigationBlockers } from './blockers';

describe('runNavigationBlockers', () => {
  it('returns true when any blocker returns false', async () => {
    await expect(
      runNavigationBlockers({
        blockers: new Set([() => undefined, () => false]),
        from: null,
        to: null,
        location: parseHref('/blocked'),
      }),
    ).resolves.toBe(true);
  });

  it('returns false when blockers allow navigation', async () => {
    await expect(
      runNavigationBlockers({
        blockers: new Set([() => true, async () => undefined]),
        from: null,
        to: null,
        location: parseHref('/allowed'),
      }),
    ).resolves.toBe(false);
  });

  it('registers and unregisters blockers through a registry', async () => {
    const registry = createNavigationBlockerRegistry();
    const unsubscribe = registry.add(() => false);

    await expect(
      registry.run({
        from: null,
        to: null,
        location: parseHref('/blocked'),
      }),
    ).resolves.toBe(true);

    unsubscribe();

    await expect(
      registry.run({
        from: null,
        to: null,
        location: parseHref('/allowed'),
      }),
    ).resolves.toBe(false);
  });
});
