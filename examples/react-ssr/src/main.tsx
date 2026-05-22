import './styles.css';
import { hydrateRoot } from 'react-dom/client';
import { createRouter, deserializeRouterState, type SerializedRouterState } from '@cookbook/router';
import { App } from './app';
import { routes } from './routes';

declare global {
  interface Window {
    __COOKBOOK_ROUTER__?: SerializedRouterState;
  }
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element was not found.');
}

const hydrationData = window.__COOKBOOK_ROUTER__
  ? deserializeRouterState(window.__COOKBOOK_ROUTER__)
  : undefined;
const router = createRouter({
  routes,
  ...(hydrationData ? { hydrationData } : {}),
});

hydrateRoot(rootElement, <App router={router} />);
