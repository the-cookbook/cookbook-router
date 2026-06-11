import './styles.css';
import { createRoot } from 'react-dom/client';
import { App, createAppRouter } from './app';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element was not found.');
}

const router = createAppRouter();
void router.start().then(() => createRoot(rootElement).render(<App router={router} />));
