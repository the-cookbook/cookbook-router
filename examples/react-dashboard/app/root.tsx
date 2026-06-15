import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import { App, createAppRouter } from './app';

const rootElement = document.getElementById('root')!;

const router = createAppRouter();

createRoot(rootElement).render(
  <StrictMode>
    <App router={router} />
  </StrictMode>
);
