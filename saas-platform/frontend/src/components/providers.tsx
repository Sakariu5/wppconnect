'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { AuthProvider } from '@/stores/auth';
import { WebSocketProvider } from '@/stores/websocket';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider children={children}>
        <WebSocketProvider children={children}>{children}</WebSocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
