import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, WorkspaceProvider } from '@moldable-ai/ui'
import { ErrorBoundary } from './components/error-boundary'
import { Providers } from '@/components/providers'
import HomePage from './app'
import './globals.css'
import './moldable-chat-safe-area'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary appName="Time Tracker">
      <ThemeProvider>
        <WorkspaceProvider>
          <Providers>
            <HomePage />
          </Providers>
        </WorkspaceProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
)
