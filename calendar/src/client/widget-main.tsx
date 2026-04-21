import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, WidgetLayout, WorkspaceProvider } from '@moldable-ai/ui'
import './globals.css'
import { QueryProvider } from './query-provider'
import WidgetPage from './widget'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <WorkspaceProvider>
        <QueryProvider>
          <WidgetLayout>
            <WidgetPage />
          </WidgetLayout>
        </QueryProvider>
      </WorkspaceProvider>
    </ThemeProvider>
  </StrictMode>,
)
