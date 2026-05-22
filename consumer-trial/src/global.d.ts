import type { SerializedRouterState } from '@cookbook/router';

declare global {
  interface Window {
    __COOKBOOK_ROUTER__?: SerializedRouterState;
  }
}
