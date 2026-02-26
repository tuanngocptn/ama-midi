import { useEffect, useRef } from 'react';
import { RouterProvider } from '@tanstack/react-router';
import { router } from '@/router';
import { useAuthStore } from '@/stores/auth-store';

export function App() {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const user = useAuthStore((s) => s.user);
  const prevUser = useRef(user);

  useEffect(() => {
    if (prevUser.current !== user) {
      router.invalidate();
    }
    prevUser.current = user;
  }, [user]);

  if (!isHydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-primary">
        <div className="text-text-secondary">Loading...</div>
      </div>
    );
  }

  return <RouterProvider router={router} />;
}
