import { QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'motion/react';
import { RouterProvider } from 'react-router';
import { queryClient } from '@/lib/queryClient';
import { router } from '@/router/router';

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Respecte le réglage « réduire les animations » du système */}
      <MotionConfig reducedMotion="user">
        <RouterProvider router={router} />
      </MotionConfig>
    </QueryClientProvider>
  );
}
