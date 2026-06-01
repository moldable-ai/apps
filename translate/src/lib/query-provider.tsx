'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode, useState } from 'react'

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Refetch on window focus (TanStack Query default)
            refetchOnWindowFocus: true,
            // Don't refetch on reconnect by default
            refetchOnReconnect: false,
            // Keep data fresh for 30 seconds
            staleTime: 30 * 1000,
            // Retry once on failure
            retry: 1,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
