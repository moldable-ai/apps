import { App } from './app'
import { MoneyApp } from './product/MoneyApp'
import { UiKitPage } from './ui-kit/UiKitPage'
import { useRoute } from './ui-kit/router'

/**
 * Top-level route switch.
 *
 * - `/plaid/*` (the connect session page `/plaid/connect?session=…` and the OAuth
 *   return `/plaid/oauth-return`) or any `?session=` → the `App`, which owns the
 *   Plaid Link handoff (`PlaidExternalConnect`). This page is opened in the user's
 *   external browser during connect; it must render there, not the product.
 * - `/ui-kit` → the design surface (component gallery, playground, card author).
 * - `/admin` → the original admin/dev console in dev builds, or when explicitly
 *   enabled with `VITE_MONEY_ENABLE_ADMIN=true`.
 * - everything else (incl. `/`) → the consumer product: Dashboards home →
 *   Dashboard detail.
 */
export function Root() {
  const path = useRoute()
  if (typeof window !== 'undefined') {
    const hasSession = new URLSearchParams(window.location.search).has(
      'session',
    )
    if (window.location.pathname.startsWith('/plaid/') || hasSession)
      return <App />
  }
  if (path.startsWith('/ui-kit')) return <UiKitPage />
  if (
    path.startsWith('/admin') &&
    (import.meta.env.DEV || import.meta.env.VITE_MONEY_ENABLE_ADMIN === 'true')
  ) {
    return <App />
  }
  return <MoneyApp />
}
