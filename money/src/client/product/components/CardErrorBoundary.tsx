import { Component, type ErrorInfo, type ReactNode } from 'react'
import { CardShell } from '../../ui-kit/cards'

/**
 * Isolates a single card's render. Card formulas are an open, agent-authored
 * space, so an unexpected value shape reaching a renderer should degrade to one
 * "couldn't render" tile — not white-screen the whole dashboard via the host
 * error boundary. Falls back to the card's own error state so layout is kept.
 */
export class CardErrorBoundary extends Component<
  { title: string; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Surface in the console for debugging without taking down the app.
    console.error(`Card "${this.props.title}" failed to render`, error, info)
  }

  render(): ReactNode {
    if (this.state.failed) {
      return (
        <CardShell
          title={this.props.title}
          state="error"
          errorMessage="This card couldn’t render."
        />
      )
    }
    return this.props.children
  }
}
