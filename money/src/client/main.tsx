import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  AppErrorBoundary,
  ThemeProvider,
  WorkspaceProvider,
  installMoldableFrameLifecycle,
} from '@moldable-ai/ui'
import { Root } from './Root'
import './globals.css'
import './moldable-chat-safe-area'
import { QueryProvider } from './query-provider'

installMoldableFrameLifecycle()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary appName="Money">
      <ThemeProvider>
        <WorkspaceProvider>
          <QueryProvider>
            <Root />
          </QueryProvider>
        </WorkspaceProvider>
      </ThemeProvider>
    </AppErrorBoundary>
  </StrictMode>,
)
