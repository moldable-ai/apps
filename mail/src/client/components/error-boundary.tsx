import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@moldable-ai/ui'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Mail UI crashed:', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <main className="bg-background text-foreground flex min-h-screen items-center justify-center p-6">
        <div className="border-border bg-card max-w-md rounded-2xl border p-5 shadow-sm">
          <h1 className="text-base font-semibold">Mail hit a UI error</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Reload Mail to recover. If this keeps happening, ask Moldable to
            inspect the Mail client error.
          </p>
          <pre className="bg-muted text-muted-foreground mt-4 max-h-32 overflow-auto rounded-lg p-3 text-xs">
            {this.state.error.message}
          </pre>
          <Button
            type="button"
            className="mt-4 cursor-pointer"
            onClick={() => window.location.reload()}
          >
            Reload Mail
          </Button>
        </div>
      </main>
    )
  }
}
