import { StrictMode } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import {
  AppErrorBoundary,
  type AppErrorSource,
  ThemeProvider,
  WorkspaceProvider,
  installMoldableFrameLifecycle,
} from '@moldable-ai/ui'
import './globals.css'
import './moldable-chat-safe-area'
import { QueryProvider } from './query-provider'

installMoldableFrameLifecycle()

function toError(value: unknown): Error {
  if (value instanceof Error) return value
  if (typeof value === 'string') return new Error(value)
  try {
    return new Error(JSON.stringify(value))
  } catch {
    return new Error(String(value))
  }
}

function renderError(root: Root, error: unknown, source: AppErrorSource) {
  root.render(
    <StrictMode>
      <AppErrorBoundary
        appName="Reader"
        initialError={toError(error)}
        initialSource={source}
      >
        <div />
      </AppErrorBoundary>
    </StrictMode>,
  )
}

async function startReader() {
  const rootElement = document.getElementById('root')
  if (!rootElement) {
    throw new Error('Reader could not find the #root element.')
  }

  const root = createRoot(rootElement)

  try {
    const { App } = await import('./app')

    root.render(
      <StrictMode>
        <AppErrorBoundary appName="Reader">
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
  } catch (error) {
    console.error('Reader failed to start:', error)
    renderError(root, error, 'bootstrap')
  }
}

void startReader().catch((error) => {
  const rootElement = document.getElementById('root')
  if (!rootElement) {
    console.error('Reader failed before #root was available:', error)
    return
  }
  renderError(createRoot(rootElement), error, 'bootstrap')
})
