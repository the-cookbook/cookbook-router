import type { ReactElement } from 'react';
import { OutletContext, useSlotRenderContext } from '../provider/router-context';

/** Props for rendering a named slot from the nearest layout context. */
export interface SlotProps<T = unknown> {
  readonly name: string;
  readonly context?: T;
}

/**
 * Renders content for a named layout slot.
 *
 * Route traversal, slot matching, fallbacks, and intercept selection are owned
 * by `@cookbook/router`. The React slot component only selects the rendered
 * slot output from the nearest layout context and provides slot-local outlet
 * context to that subtree.
 */
export function Slot<T = unknown>(props: SlotProps<T>): ReactElement | null {
  const value = useSlotRenderContext();

  if (!value) {
    return null;
  }

  const rendered = value.slots[props.name];

  if (rendered === undefined || rendered === null) {
    return null;
  }

  return (
    <OutletContext.Provider value={{ context: props.context }}>{rendered}</OutletContext.Provider>
  );
}
