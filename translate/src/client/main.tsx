import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, WorkspaceProvider } from '@moldable-ai/ui'
import { QueryProvider } from '@/lib/query-provider'
import { ErrorBoundary } from './components/error-boundary'
import Home from './app'
import './globals.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary appName="Translate">
      <ThemeProvider>
        <WorkspaceProvider>
          <QueryProvider>
            <Home />
          </QueryProvider>
        </WorkspaceProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
)
