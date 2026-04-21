import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, WidgetLayout, WorkspaceProvider } from '@moldable-ai/ui'
import './globals.css'
import { Widget } from './widget'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <WorkspaceProvider>
        <WidgetLayout>
          <Widget />
        </WidgetLayout>
      </WorkspaceProvider>
    </ThemeProvider>
  </StrictMode>,
)
