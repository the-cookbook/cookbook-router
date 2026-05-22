import type { ReactElement, ReactNode } from 'react';
import { OutletContext, useOutletContextValue } from '../context/router-context';

export interface OutletProps<T = unknown> {
  readonly context?: T;
  readonly children?: ReactNode;
}

export function Outlet<T = unknown>(props: OutletProps<T>): ReactElement | null {
  const value = useOutletContextValue();
  const outlet = props.children ?? value?.outlet ?? null;

  if (outlet === null || outlet === undefined || outlet === false) {
    return null;
  }

  return (
    <OutletContext.Provider value={{ outlet, context: props.context }}>
      {outlet}
    </OutletContext.Provider>
  );
}
