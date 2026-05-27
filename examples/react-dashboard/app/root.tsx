import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import { createRouter } from '@cookbook/router';
import { RouterProvider } from '@cookbook/router-react';
import { NotFound } from './pages/not-found/page';
import { routes, constraints } from './routes';

import './app.css';

const rootElement = document.getElementById('root')!;

const router = createRouter({
  routes,
});

router.resolveCurrent().then(() =>
  createRoot(rootElement).render(
    <StrictMode>
      <RouterProvider
        router={router}
        fallback={<NotFound />}
        scrollBehavior="smooth"
        scrollRestoration
      />
    </StrictMode>
  )
);
