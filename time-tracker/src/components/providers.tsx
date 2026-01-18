'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useState } from 'react'
import { WorkspaceProvider } from '@moldable-ai/ui'
import { TimeTrackerProvider } from './time-tracker-context'

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000, // 30 seconds
          },
        },
      }),
  )

  return (
    <WorkspaceProvider>
      <QueryClientProvider client={queryClient}>
        <TimeTrackerProvider>{children}</TimeTrackerProvider>
      </QueryClientProvider>
    </WorkspaceProvider>
  )
}
