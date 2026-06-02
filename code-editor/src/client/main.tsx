import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  AppErrorBoundary,
  ThemeProvider,
  WorkspaceProvider,
  installMoldableFrameLifecycle,
} from '@moldable-ai/ui'
import { QueryProvider } from '@/lib/query-provider'
import App from './app'
import './globals.css'
import './moldable-chat-safe-area'

installMoldableFrameLifecycle()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary appName="Code">
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
