import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, WidgetLayout, WorkspaceProvider } from '@moldable-ai/ui'
import { ErrorBoundary } from './components/error-boundary'
import './globals.css'
import { Widget } from './widget'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary appName="Hello Moldables" surface="widget">
      <ThemeProvider>
        <WorkspaceProvider>
          <WidgetLayout>
            <Widget />
          </WidgetLayout>
        </WorkspaceProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
)
