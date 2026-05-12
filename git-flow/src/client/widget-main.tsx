import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, WorkspaceProvider } from '@moldable-ai/ui'
import { ErrorBoundary } from './components/error-boundary'
import './globals.css'
import GitWidgetPage from './widget'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary appName="Git" surface="widget">
      <ThemeProvider>
        <WorkspaceProvider>
          <GitWidgetPage />
        </WorkspaceProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
)
