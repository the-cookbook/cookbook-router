interface ScrollHistoryState {
  readonly __cookbookRouterScroll?: {
    readonly preventReset?: boolean;
  };
}

export function createScrollHistoryState(
  state: unknown,
  preventScrollReset: boolean | undefined,
): unknown {
  if (preventScrollReset !== true) {
    return state;
  }

  const scrollState: ScrollHistoryState['__cookbookRouterScroll'] = { preventReset: true };

  if (!state || typeof state !== 'object') {
    return { __cookbookRouterScroll: scrollState };
  }

  return {
    ...state,
    __cookbookRouterScroll: scrollState,
  };
}
