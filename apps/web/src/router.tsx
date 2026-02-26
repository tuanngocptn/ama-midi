import {
  createRouter,
  createRoute,
  createRootRoute,
  redirect,
  Outlet,
} from '@tanstack/react-router';
import { useAuthStore } from '@/stores/auth-store';
import { AuthPage } from '@/pages/AuthPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { EditorPage } from '@/pages/EditorPage';

const rootRoute = createRootRoute({
  component: Outlet,
});

const authRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth',
  beforeLoad: () => {
    const { user } = useAuthStore.getState();
    if (user) throw redirect({ to: '/' });
  },
  component: AuthPage,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    const { user } = useAuthStore.getState();
    if (!user) throw redirect({ to: '/auth' });
  },
  component: DashboardPage,
});

const editorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/songs/$songId',
  beforeLoad: () => {
    const { user } = useAuthStore.getState();
    if (!user) throw redirect({ to: '/auth' });
  },
  component: EditorPage,
});

const routeTree = rootRoute.addChildren([
  authRoute,
  dashboardRoute,
  editorRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
