import { createBrowserRouter } from 'react-router';

import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';

/* React Router 8 data mode: route objects take `Component` (a component type),
   not `element` (a rendered node). `*` is the catch-all.
   Exercise 1 adds `/movies` and `/movies/:id` here. */
export const router = createBrowserRouter([
  { path: '/', Component: HomePage },
  { path: '*', Component: NotFoundPage },
]);
