import type { ReactElement, ReactNode } from 'react';
import { OutletContext, useOutletRenderContextValue } from '../context/router-context';

export interface OutletProps<T = unknown> {
  readonly context?: T;
  readonly children?: ReactNode;
}

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
