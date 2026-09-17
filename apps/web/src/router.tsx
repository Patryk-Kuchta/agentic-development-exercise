import { createBrowserRouter } from 'react-router';

import { HomePage } from './pages/HomePage';
import { Layout } from './pages/Layout';
import { NotFoundPage } from './pages/NotFoundPage';
import { SignInPage } from './pages/SignInPage';
import { SignUpPage } from './pages/SignUpPage';

/* React Router 8 data mode: route objects take `Component` (a component type),
   not `element` (a rendered node). `*` is the catch-all.

   Everything is nested under `Layout`, which draws the header and renders an
   `<Outlet />` — so a new page gets the header, and the way to sign out, for
   free. Exercise 1 adds `/movies` and `/movies/:id` here. */
export const router = createBrowserRouter([
  {
    Component: Layout,
    children: [
      { path: '/', Component: HomePage },
      { path: '/sign-in', Component: SignInPage },
      { path: '/sign-up', Component: SignUpPage },
      { path: '*', Component: NotFoundPage },
    ],
  },
]);
