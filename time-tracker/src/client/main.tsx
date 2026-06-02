import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  AppErrorBoundary,
  ThemeProvider,
  WorkspaceProvider,
  installMoldableFrameLifecycle,
} from '@moldable-ai/ui'
import { Providers } from '@/components/providers'
import HomePage from './app'
import './globals.css'
import './moldable-chat-safe-area'

installMoldableFrameLifecycle()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary appName="Time Tracker">
      <ThemeProvider>
        <WorkspaceProvider>
          <Providers>
            <HomePage />
          </Providers>
        </WorkspaceProvider>
      </ThemeProvider>
    </AppErrorBoundary>
  </StrictMode>,
)
