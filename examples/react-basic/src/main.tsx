import './styles.css';
import { createRoot } from 'react-dom/client';
import { App } from './app';
import { createAppRouter } from './router';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element was not found.');
}

const router = createAppRouter();

createRoot(rootElement).render(<App router={router} />);
