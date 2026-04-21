import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, WorkspaceProvider } from '@moldable-ai/ui'
import MeetingsPage from './app'
import './globals.css'
import { QueryProvider } from './query-provider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <WorkspaceProvider>
        <QueryProvider>
          <MeetingsPage />
        </QueryProvider>
      </WorkspaceProvider>
    </ThemeProvider>
  </StrictMode>,
)
