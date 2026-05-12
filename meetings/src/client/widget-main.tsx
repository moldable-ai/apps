import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, WidgetLayout, WorkspaceProvider } from '@moldable-ai/ui'
import { ErrorBoundary } from './components/error-boundary'
import './globals.css'
import { QueryProvider } from './query-provider'
import MeetingsWidget from './widget'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary appName="Meetings" surface="widget">
      <ThemeProvider>
        <WorkspaceProvider>
          <QueryProvider>
            <WidgetLayout>
              <MeetingsWidget />
            </WidgetLayout>
          </QueryProvider>
        </WorkspaceProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
)
