import { Component } from 'react';
import type { ComponentType, ReactElement, ReactNode } from 'react';
import {
  OutletContext,
  SlotErrorIsolationContext,
  useSlotRenderContext,
} from '../provider/router-context';

/** Props passed to a slot-local error fallback component. */
export interface SlotErrorFallbackProps {
  readonly error: unknown;
  readonly reset: () => void;
}

export type SlotErrorFallback = ComponentType<SlotErrorFallbackProps> | null;

/** Props for rendering a named slot from the nearest layout context. */
export interface SlotProps<T = unknown> {
  readonly name: string;
  readonly context?: T;
  /**
   * Slot-local render-error fallback.
   *
   * When omitted, slot errors continue to bubble to the route/provider error
   * boundary. When provided, slot errors are isolated to this slot. Pass null
   * to render nothing for slot errors.
   */
  readonly errorFallback?: SlotErrorFallback;
}

interface SlotErrorBoundaryProps {
  readonly fallback: SlotErrorFallback;
  readonly children: ReactNode;
}

interface SlotErrorBoundaryState {
  readonly error: unknown | undefined;
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

  const content = (
    <OutletContext.Provider value={{ context: props.context }}>{rendered}</OutletContext.Provider>
  );

  if (!('errorFallback' in props)) {
    return content;
  }

  return (
    <SlotErrorBoundary fallback={props.errorFallback ?? null}>
      <SlotErrorIsolationContext.Provider value={{ enabled: true }}>
        {content}
      </SlotErrorIsolationContext.Provider>
    </SlotErrorBoundary>
  );
}

class SlotErrorBoundary extends Component<SlotErrorBoundaryProps, SlotErrorBoundaryState> {
  readonly state: SlotErrorBoundaryState = { error: undefined };

  static getDerivedStateFromError(error: unknown): SlotErrorBoundaryState {
    return { error };
  }

  componentDidUpdate(previousProps: SlotErrorBoundaryProps): void {
    if (previousProps.children !== this.props.children && this.state.error !== undefined) {
      this.setState({ error: undefined });
    }
  }

  render(): ReactNode {
    if (this.state.error !== undefined) {
      const reset = (): void => this.setState({ error: undefined });

      if (!this.props.fallback) {
        return null;
      }

      const Fallback = this.props.fallback;
      return <Fallback error={this.state.error} reset={reset} />;
    }

    return this.props.children;
  }
}
