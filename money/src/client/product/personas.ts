/**
 * Persona-flavored "best practices" dashboards. Each speaks to a financial
 * identity ("that's me") and composes a curated set of the real card definitions
 * (`/api/cards/templates` ids) into a coherent view. These drive three things:
 *
 *  1. The onboarding "which of these is you?" chooser.
 *  2. Provisioning real dashboards via `PATCH /api/dashboards/:id`.
 *  3. The Dashboards home tiles.
 *
 * Card ids here MUST match real definition ids from `/api/cards/templates`. The
 * renderer/drilldown stack degrades gracefully when a card has no data yet, so
 * an extension-dependent card (subscriptions, obligations) just shows an empty
 * state until labeling/sync fills it in.
 */

export interface PersonaDashboard {
  id: string
  /** Short dashboard name (host header shows it; we never render our own). */
  name: string
  /** One-line identity hook used in the onboarding chooser. */
  tagline: string
  /** Who this is for — the "that's me" descriptor. */
  audience: string
  /** lucide icon name (resolved in the UI). */
  icon: string
  /** Ordered real card definition ids. */
  cardIds: string[]
}

export const PERSONA_DASHBOARDS: PersonaDashboard[] = [
  {
    id: 'overview',
    name: 'Overview',
    tagline: 'The whole picture — net worth, savings, and where it goes.',
    audience: 'I want one screen that tells me if I’m okay.',
    icon: 'LayoutDashboard',
    cardIds: [
      'net-worth',
      'liquid-vs-illiquid',
      'income-saved',
      'monthly-cash-flow',
      'savings-health',
      'runway',
      'financial-independence-projection',
      'credit-utilization',
      'expense-breakdown',
      'largest-expenses',
    ],
  },
  {
    id: 'fire',
    name: 'FIRE / Freedom',
    tagline:
      'Net worth, freedom age, and the savings rate that gets you there.',
    audience: 'I’m optimizing for financial independence and early retirement.',
    icon: 'Flame',
    cardIds: [
      'net-worth',
      'liquid-vs-illiquid',
      'financial-independence-projection',
      'runway',
      'savings-health',
      'investments',
      'investment-allocation',
      'tax-advantaged-contributions',
      'income-saved',
    ],
  },
  {
    id: 'cashflow',
    name: 'Cash Flow & Spending',
    tagline: 'Income vs outflow, category drift, and lifestyle creep.',
    audience: 'I budget like a YNAB/Copilot user and watch every category.',
    icon: 'ArrowLeftRight',
    cardIds: [
      'monthly-cash-flow',
      'income-saved',
      'expense-breakdown',
      'recurring-spend-by-need',
      'income-sources',
      'largest-expenses',
      'top-merchants',
      'monthly-merchant-spend',
    ],
  },
  {
    id: 'debt',
    name: 'Debt & Obligations',
    tagline: 'Payoff strategy, utilization, and the bills that sneak up.',
    audience: 'I’m paying down debt and never want a surprise bill.',
    icon: 'CreditCard',
    cardIds: [
      'debt-payoff-optimizer',
      'credit-utilization',
      'card-account-spend',
      'upcoming-recurring-obligations',
      'subscription-cost',
      'active-subscriptions',
      'monthly-cash-flow',
    ],
  },
]

export const PERSONA_BY_ID = Object.fromEntries(
  PERSONA_DASHBOARDS.map((p) => [p.id, p]),
) as Record<string, PersonaDashboard>
