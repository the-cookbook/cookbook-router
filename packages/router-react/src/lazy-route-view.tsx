import React, { type ComponentType, type LazyExoticComponent } from 'react';

export interface LazyRouteViewComponent<
  Component extends ComponentType<any> = ComponentType<any>,
> extends LazyExoticComponent<Component> {
  readonly preload: () => Promise<{
    readonly default: Component;
  }>;
}

export function lazyRouteView<Component extends ComponentType<any>>(
  load: () => Promise<{
    readonly default: Component;
  }>,
): LazyRouteViewComponent<Component> {
  let promise: Promise<{ readonly default: Component }> | undefined;

  const preload = (): Promise<{ readonly default: Component }> => {
    promise ??= load();

    return promise;
  };

  const Component = React.lazy(preload) as LazyRouteViewComponent<Component>;

  Object.defineProperty(Component, 'preload', {
    value: preload,
    enumerable: false,
    configurable: false,
    writable: false,
  });

  return Component;
}
