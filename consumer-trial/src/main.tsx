import { StrictMode } from 'react';
import { hydrateRoot, createRoot } from 'react-dom/client';
import { deserializeRouterState } from '@cookbook/router';
import { App } from './app';
import { createTrialRouter } from './router';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Missing #root container.');
}

const hydrationData = window.__COOKBOOK_ROUTER__
  ? deserializeRouterState(window.__COOKBOOK_ROUTER__)
  : undefined;
const router = createTrialRouter({ hydrationData });

if (hydrationData) {
  hydrateRoot(
    container,
    <StrictMode>
      <App router={router} />
    </StrictMode>,
  );
} else {
  createRoot(container).render(
    <StrictMode>
      <App router={router} />
    </StrictMode>,
  );
}
