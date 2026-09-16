import { createBrowserRouter } from 'react-router';

import { NotFoundPage } from './pages/NotFoundPage';
import { TasksPage } from './pages/TasksPage';

/* React Router 8 data mode: route objects take `Component` (a component type),
   not `element` (a rendered node). `*` is the catch-all. */
export const router = createBrowserRouter([
  { path: '/', Component: TasksPage },
  { path: '*', Component: NotFoundPage },
]);
