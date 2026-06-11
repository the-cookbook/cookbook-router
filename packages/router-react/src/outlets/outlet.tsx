import type { ReactElement, ReactNode } from 'react';
import { OutletContext, useOutletRenderContextValue } from '../provider/router-context';

/** Props for rendering descendant branch content and providing outlet context. */
export interface OutletProps<T = unknown> {
  readonly context?: T;
  readonly children?: ReactNode;
}

/**
 * Renders the next matched child branch for the current route.
 *
 * `context` is exposed to descendants through `useOutletContext`. Explicit
 * children override the router-provided outlet and are useful for custom layout
 * shells.
 */
export function Outlet<T = unknown>(props: OutletProps<T>): ReactElement | null {
  const value = useOutletRenderContextValue();
  const outlet = props.children ?? value?.outlet ?? null;

  if (outlet === null || outlet === undefined || outlet === false) {
    return null;
  }

  return (
    <OutletContext.Provider value={{ context: props.context }}>{outlet}</OutletContext.Provider>
  );
}
