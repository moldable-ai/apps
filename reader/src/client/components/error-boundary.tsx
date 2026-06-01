import { MessageSquareWarning, RefreshCw } from 'lucide-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@moldable-ai/ui'

export type ErrorSource = 'react' | 'window' | 'promise' | 'bootstrap'

interface ErrorBoundaryProps {
  appName: string
  children: ReactNode
  initialError?: Error | null
  initialSource?: ErrorSource
}

interface ErrorBoundaryState {
  error: Error | null
  source: ErrorSource
  componentStack: string | null
}

function toError(value: unknown): Error {
  if (value instanceof Error) return value
  if (typeof value === 'string') return new Error(value)
  try {
    return new Error(JSON.stringify(value))
  } catch {
    return new Error(String(value))
  }
}

function formatError(
  error: Error,
  source: ErrorSource,
  componentStack: string | null,
) {
  const parts = [`${error.name}: ${error.message}`]
  if (error.stack) parts.push(error.stack)
  if (componentStack) parts.push(`React component stack:${componentStack}`)
  parts.push(`Source: ${source}`)
  return parts.join('\n\n')
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      error: props.initialError ?? null,
      source: props.initialSource ?? 'react',
      componentStack: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error, source: 'react' }
  }

  componentDidMount(): void {
    window.addEventListener('error', this.handleWindowError, true)
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection)
  }

  componentWillUnmount(): void {
    window.removeEventListener('error', this.handleWindowError, true)
    window.removeEventListener(
      'unhandledrejection',
      this.handleUnhandledRejection,
    )
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`${this.props.appName} UI crashed:`, error, info)
    this.setState({ componentStack: info.componentStack ?? null })
  }

  private handleWindowError = (event: ErrorEvent): void => {
    const error =
      event.error instanceof Error ? event.error : new Error(event.message)
    console.error(`${this.props.appName} uncaught frontend error:`, error)
    event.preventDefault()
    this.setState({ error, source: 'window', componentStack: null })
  }

  private handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
    const error = toError(event.reason)
    console.error(`${this.props.appName} unhandled promise rejection:`, error)
    event.preventDefault()
    this.setState({ error, source: 'promise', componentStack: null })
  }

  private reload = (): void => {
    window.location.reload()
  }

  private askMoldable = (): void => {
    const { error, source, componentStack } = this.state
    if (!error) return
    const errorReport = formatError(error, source, componentStack)
    const text = [
      `${this.props.appName} hit an uncaught frontend error.`,
      'Please inspect and fix the client crash.',
      errorReport,
    ].join('\n\n')
    window.parent.postMessage({ type: 'moldable:set-chat-input', text }, '*')
  }

  render() {
    const { error, source, componentStack } = this.state
    if (!error) return this.props.children

    const errorSummary = formatError(error, source, componentStack)

    return (
      <main
        data-reader-error-boundary="active"
        className="bg-background text-foreground flex h-full min-h-screen items-center justify-center p-4 sm:p-6"
      >
        <section className="border-border bg-card w-full max-w-xl rounded-lg border p-5 shadow-lg sm:p-6">
          <div className="space-y-2">
            <h1 className="text-xl font-semibold tracking-tight">
              {this.props.appName} hit a UI error
            </h1>
            <p className="text-muted-foreground text-sm leading-6">
              Reload to recover, or send the captured client error to Moldable
              so it can inspect the crash.
            </p>
          </div>

          <pre className="bg-muted text-muted-foreground mt-5 max-h-44 overflow-auto whitespace-pre-wrap rounded-md border p-3 font-mono text-xs">
            {errorSummary}
          </pre>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              className="cursor-pointer"
              onClick={this.reload}
            >
              <RefreshCw />
              Reload
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="cursor-pointer"
              onClick={this.askMoldable}
            >
              <MessageSquareWarning />
              Ask Moldable to fix this
            </Button>
          </div>
        </section>
      </main>
    )
  }
}
