import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, WorkspaceProvider } from '@moldable-ai/ui'
import { ErrorBoundary } from './components/error-boundary'
import CalendarPage from './app'
import './globals.css'
import './moldable-chat-safe-area'
import { QueryProvider } from './query-provider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary appName="Calendar">
      <ThemeProvider>
        <WorkspaceProvider>
          <QueryProvider>
            <CalendarPage />
          </QueryProvider>
        </WorkspaceProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
)
