# Moldable Money — UI Kit PRD

A reusable, formula-backed card + dashboard UI kit for Moldable Money, living on
the **`/ui-kit`** route. It turns typed formula results from the backend into a
premium, dark-mode, data-driven dashboard the way Copilot Money / Robinhood /
Monarch feel — and it does so as a set of composable **legos** an AI agent can
reason about and assemble into new cards and dashboards.

> Route split: `/` keeps the existing Plaid/admin Money app. `/ui-kit` is the new
> design surface. A tiny client router (`ui-kit/router.ts`) switches between them
> in `client/Root.tsx`. The admin route gained one "UI Kit" link; nothing else
> about `/` changed.

## Design principles (locked)

- **Render by runtime value shape first**, then card `kind`, then `format`. New
  backend formulas/kinds keep working with zero UI changes.
- **Semantic tokens only** — `bg-card`, `text-muted-foreground`,
  `text-success/destructive/warning`, `chart-1..5`. No raw Tailwind palettes or
  hex in JSX. Brand chips derive a deterministic hue from `chart-1..5`.
- **Low chrome.** One bordered tile per metric, never nested cards; lists are
  divided rows inside the one tile. Color the number, not the surface.
- **Three type tiers only:** hero (`clamp(2.4rem,5vw,3.4rem)`), card-value
  (`~1.9rem`), secondary (`13–15px`). Tabular figures everywhere (`uk-nums`).
- **Gradient = data viz only.** The signature orange→violet (`--chart-1` →
  `--chart-4`) lives on hero chart strokes/fills, never on card surfaces.
- **Delta polarity is explicit.** `asset` (up = good = success) vs `expense`
  (up = bad = destructive). Glyph ▲/▼ always rides along — color is never the
  sole signal.
- **Motion always, gated on `prefers-reduced-motion`** — entrance stagger,
  count-up, line draw-in, hover lift, flip-to-formula, chart scrub. CSS/Web
  Animations only (no framer-motion — Rolldown breaks it in prod).

## Architecture (the legos)

```text
src/client/ui-kit/
  lib/
    types.ts        # client mirrors of backend card/formula/value contracts
    format.ts       # value-shape guards + locale formatters + delta math
    colors.ts       # chart token ramp + hero/tone gradients
    motion.ts       # useReducedMotion, riseStyle (stagger), useCountUp
  charts/           # hand-rolled SVG, theme-token driven, zero chart deps
    geometry.ts, use-size.ts
    Sparkline, LineChart (+AreaChart), Donut, Legend, BarList,
    ColumnChart, RingGauge, ProgressBar, StackedBar
  cards/
    atoms.tsx       # MicroLabel, HeroValue, SecondaryStat, StatusDot, ValuePill
    DeltaBadge.tsx  # polarity-aware delta (asset/expense)
    MerchantChip.tsx# rounded-square brand/app identity (monogram fallback)
    CardShell.tsx   # tile chrome + flip-to-formula back + loading/empty/error
    helpers.tsx     # value-shape dispatch, secondary access, domain icons
    renderers/      # one per kind: Metric, Trend, Breakdown, EntityList,
                    #   Status, Optimizer, Comparison, Forecast
    CardRenderer.tsx# the dispatcher (extend here for new kinds)
  data/
    hooks.ts        # react-query over /api/cards, /schema, /preview, /dashboards, /data-mode
    demo.ts         # curated persona + 4 example dashboards (local only)
  sections/         # Bento, ExampleDashboards, LiveDashboard, ComponentGallery, FormulaPlayground, Shell
  UiKitPage.tsx     # full-height shell + scope bar + section nav
  router.ts         # navigate() + useRoute()
```

## Card kind → renderer

| Value shape / kind       | Renderer           | Visual                                                                                         |
| ------------------------ | ------------------ | ---------------------------------------------------------------------------------------------- |
| `series` / trend / ratio | **TrendCard**      | hero value + orange→violet line, min/max anchors, endpoint knob, timeframe toggle, hover-scrub |
| scalar / metric / list   | **MetricCard**     | hero value + delta + bottom sparkline                                                          |
| `table` / breakdown      | **BreakdownCard**  | ≤6 → donut + legend; else ranked bar list (+ bucketed "Other")                                 |
| `entity-list`            | **EntityListCard** | merchant chip + label + subtitle + amount, expandable                                          |
| status                   | **StatusCard**     | percent → ring gauge; counts → dotted status stats                                             |
| optimizer                | **OptimizerCard**  | hero target + strategy chip + ranked APR priority list                                         |
| comparison               | **ComparisonCard** | hero total + stacked split bar + legend                                                        |
| forecast / `duration`    | **ForecastCard**   | runway pills / freedom age / projected amount + surprises                                      |

## Use cases covered (from the PRD catalog)

Net worth, % income saved, monthly cash flow, runway, financial-independence /
freedom age, active subscriptions, subscription cost, expense breakdown, largest
expenses, investment allocation, savings health, transaction review queue, debt
payoff (avalanche), credit utilization, recurring spend by need (essentials vs
lifestyle creep), tax-advantaged contributions, joy-reviewed spend, income
sources, upcoming recurring obligations, shared-expense reimbursements.

## Formula vocabulary surfaced (playground palette, live from `/api/formulas/schema`)

- **Collections:** Accounts, Assets, Liabilities, Income, Expenses,
  Subscriptions, Investments, Cash, Debt, TaxSheltered (+ extension collections
  RecurringObligations, JoyReview, SharedExpenses, TaxContributions,
  ReviewActions, BudgetLabels, Merchants, Persons).
- **Methods:** Where, Sum, Count, Average, Min/Max, This/Last Month/Year, YTD,
  Between, PreviousPeriod, Rolling, Daily/Weekly/Monthly/Yearly, PeriodSum,
  PeriodAverage, MonthlyAverage, Unique, Limit, Offset, Sort, Top/Bottom,
  Min/MaxBy, GroupBy, Trend, PercentOfTotal.
- **Functions:** Runway, SavingsRate, ChangeVs, DebtPayoff, FreedomAge, Forecast.

## How an agent extends the kit

- **New card** → add a `MoneyCardDefinition` via `POST /api/cards` (primary +
  optional secondary formulas). The dispatcher renders it automatically.
- **New renderer** → add `renderers/XCard.tsx`, wire one `case` in
  `CardRenderer.tsx`, map it in `helpers.pickRenderer`.
- **New chart** → add to `charts/`, keep it SVG + semantic tokens + reduced-motion.
- A card is "a UI element backed by one or more formulas": primary value drives
  the hero, `secondaryValues` (keyed by `secondaryFormulas`) drive the chart,
  delta, breakdown, or ranked list.

## Checklist

Done

- [x] Inspected backend contracts (`/api/cards`, `/formulas/schema`,
      `/formulas/preview`, `/dashboards`, `/data-mode`) — render against live shapes.
- [x] `/ui-kit` route added without disturbing `/`.
- [x] Value-shape guards + locale formatters (money/percent/count/duration/date,
      compact, signed) + delta polarity math.
- [x] Hand-rolled SVG charts: sparkline, gradient line/area, donut, legend, bar
      list, column, ring gauge, progress/bullet, stacked bar.
- [x] Card atoms (hero value, micro-label, delta badge, merchant chip, status dot).
- [x] Card shell with flip-to-formula back + loading/empty/error states.
- [x] Eight kind renderers + central dispatcher (registry).
- [x] Four curated example dashboards (Overview, FIRE, Cash Flow, Debt) from one
      coherent demo persona — local only, never POSTed.
- [x] Live dashboard from real `/api/cards` + a live `/api/formulas/preview` trend.
- [x] Component gallery (every renderer + state + chart primitive).
- [x] Formula playground: live preview, schema-driven palette with live
      collection values, typed result via the same renderers, diagnostics.
- [x] Motion (entrance/count-up/draw-in/hover/flip/scrub), reduced-motion gated.
- [x] Responsive (single-column reflow, scrollable tabs).
- [x] **Author** section — card create flow: curated template picker
      (`GET /api/cards/templates?includeEvaluation=true`, category filter +
      per-template tested ✓), formula editor with live preview, auto-derived but
      overridable kind/format, optional secondary formula, validate
      (`POST /api/cards/test` → pass/fail + `repairHints`), and save
      (`POST /api/cards`, invalidates the live dashboard so it appears at once).
- [x] **Drilldown** — any transaction-backed live card carries a receipt action
      that opens a paged, card-scoped `/api/cards/:id/transactions` sheet (search,
      optional direction refinement, offset paging). The backend resolves the
      card's formula/collection, so it shows the rows behind the number, not every
      transaction. Read-only.
- [x] Card legos gained a first-class header `action` slot (threaded through every
      renderer + `shellPropsFor`), used by the drilldown trigger.
- [x] `pnpm lint` / `check-types` / `test` (75) all green.

Next

- [ ] Card edit/delete (`PATCH /api/cards/:id`, refresh) from the live cards.
- [ ] Per-card live secondary evaluation (auto-fetch trend secondaries for live cards).
- [ ] User-arrangeable dashboards (`PATCH /api/dashboards/:id`), drag to reorder.
- [ ] Real merchant logos (asset hosting) behind the monogram fallback.
- [ ] Adopt selected card legos on the main `/` route once stable.
- [ ] Backend-completion autocomplete in `FormulaInput` (now that
      `POST /api/formulas/complete` exists — context-aware next-methods, field
      args, enum values; today the editor uses the local schema-only fallback).
- [ ] Transaction review queue UI (`GET /api/transactions/review` + classify /
      label / proposal-accept loop) — newly unblocked on the backend.
- [ ] Extension-aware cards (joy review, shared expenses, tax contributions) —
      collections are now executable; surface dedicated authoring affordances.
