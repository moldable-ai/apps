import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  AppErrorBoundary,
  ThemeProvider,
  WorkspaceProvider,
  installMoldableFrameLifecycle,
} from '@moldable-ai/ui'
import { App } from './app'
import './globals.css'
import './moldable-chat-safe-area'
import { QueryProvider } from './query-provider'

installMoldableFrameLifecycle()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary appName="Redecorate">
      <ThemeProvider>
        <WorkspaceProvider>
          <QueryProvider>
            <App />
          </QueryProvider>
        </WorkspaceProvider>
      </ThemeProvider>
    </AppErrorBoundary>
  </StrictMode>,
)
