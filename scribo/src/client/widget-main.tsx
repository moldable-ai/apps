import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, WidgetLayout, WorkspaceProvider } from '@moldable-ai/ui'
import { QueryProvider } from '@/lib/query-provider'
import { ErrorBoundary } from './components/error-boundary'
import './globals.css'
import Widget from './widget'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary appName="Scribo Languages" surface="widget">
      <ThemeProvider>
        <WorkspaceProvider>
          <QueryProvider>
            <WidgetLayout>
              <Widget />
            </WidgetLayout>
          </QueryProvider>
        </WorkspaceProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
)
