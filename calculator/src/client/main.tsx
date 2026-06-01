import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, WorkspaceProvider } from '@moldable-ai/ui'
import { ErrorBoundary } from './components/error-boundary'
import { App } from './app'
import './globals.css'
import { QueryProvider } from './query-provider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary appName="Calculator">
      <ThemeProvider>
        <WorkspaceProvider>
          <QueryProvider>
            <App />
          </QueryProvider>
        </WorkspaceProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
)
