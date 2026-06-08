# Money App Agent Handoff

This file is the coordination point between backend and frontend agents. If you
consume or change one of these contracts, edit this file with what changed and
what is still open.

## Coordination Rules

- Do not clobber another agent's work. Check current files before editing.
- Frontend/UI-kit work should stay in `src/client/**`, PRDs, unless a backend contract
  change is explicitly needed. (Treat the frontend eng as the PM and let them have final say on the UX needs).
- Backend work should stay in `src/server/**`, `moldable.json`, PRDs, and data
  contract docs unless UI glue is explicitly needed.
- Do not start the dev server manually; Moldable owns app lifecycle.
- Use `https://money.localhost:1355` for runtime smoke checks when Moldable has
  the app running.

## Frontend / UI-Kit Status (frontend agent)

There are now THREE client surfaces, switched in `src/client/Root.tsx`:

- **`/` → the consumer product** (`src/client/product/**`): first-run onboarding
  → Dashboards home → Dashboard detail. This is the default experience.
- **`/ui-kit` → the design surface** (`src/client/ui-kit/**`): example dashboards,
  live dashboard, component gallery, formula playground, card **Author**.
- **`/admin` and `/plaid/oauth-return` → the original admin/dev console**
  (`src/client/app.tsx`): Plaid connect, formula test, raw metrics. Kept intact;
  the product's "Connect your bank" hands off here for the proven Plaid flow.

The **product** (`src/client/product/`): a view state machine driving Moldable's
desktop nav stack (`pushMoldableNavigation` / `useMoldableNavigationPop` — host
owns the title + back button; we render no app header). FTUE flow:

- `screens/OnboardingCarousel.tsx` — first-run "install a dashboard" carousel:
  swipe the 4 dashboards, each previewed with the demo persona as compact
  `MiniCard`s, Install the ones that resonate.
- After install → home shows ONLY the installed dashboards, still on **sample
  data** with a per-dashboard **DEMO** badge + a persistent **ConnectBanner**
  ("connect your first account"). Connecting an account flips them to live and
  clears the badges/banner.
- `MoneyApp.tsx` — the state machine. `demoMode = ?ftue || accounts===0`
  (from `GET /api/data-health` `counts.accounts`); demo renders installed
  dashboards from the client persona, live from `/api/cards`. Existing users
  with accounts auto-install the 4 personas and skip the carousel. `?ftue=1`
  previews the full FTUE on any workspace.
- `data/onboarding.ts` — persists `{onboarded, installed}` per workspace
  (localStorage). `personas.ts` — the 4 curated card-id sets; install provisions
  via `PATCH /api/dashboards/:id` (upsert = de-facto create). `data/demo.ts`
  maps the ui-kit demo persona into the product (`DEMO_DASHBOARD_BY_ID`).
- `screens/DashboardsHome.tsx` — card-less column of `DashboardSection` rollups
  (title + 2–3 `MiniCard`s + "View all"). `screens/DashboardDetail.tsx` — a
  dashboard's cards in a **masonry** (`components/MasonryGrid.tsx`, natural
  heights, no stretching) with the card-scoped drilldown.
- "Connect an account" currently hands off to `/admin` (inline Plaid = follow-up).

The UI kit also has a card **Author** (create flow), a card-scoped transaction
**drilldown**, a header `action` slot on every renderer, and a **Monaco** formula
editor (`ui-kit/sections/FormulaEditor.tsx`): a `moneyFormula` language with
tokenization + a completion provider wired to `POST /api/formulas/complete`,
themed to match (orange collections, violet functions, sky methods). Monaco is
CDN-lazy-loaded via `@monaco-editor/react` (as in db-browser), so it needs
network on first editor mount and adds ~nothing to the initial bundle. It powers
both the Author and the Playground (replacing the hand-rolled `FormulaInput`).
All work stayed under `src/client/**` — no backend files touched.

Contracts the UI kit consumes (read-only unless noted):

- `GET /api/cards` → `{ definitions, cards, materialized }`; renders the live
  dashboard. Renderers dispatch on each card's runtime `value` shape, so new
  card kinds/formulas render with no UI change.
- `GET /api/cards/templates?includeEvaluation=true&limit=100` → the Author
  template picker. Reads `templates[].{title,category,definition,
requiredExtensions,test.ok}`.
- `POST /api/cards/test` `{ cards:[def] }` → validate-before-save; reads
  `cards[0].{ok,result.outputType,error.message,repairHints,repairActions}` and
  top-level `nextActions` for the first executable repair loop.
- `POST /api/cards` `{ title, primaryFormula, kind, format, secondaryFormulas?,
description? }` → save; on `!ok` reads `error.{code,message}`. Success
  invalidates the `['ui-kit','cards']` / `['ui-kit','dashboards']` queries.
- `GET /api/cards/:id/transactions?q&category&direction&limit&offset&formulaKey`
  → the
  drilldown sheet (card-scoped — thanks for building this). Reads
  `{ transactions[], total, hasMore, collection, drilldownBasis, formulaFiltered }`;
  the backend resolves the card's formula/collection so the sheet shows the rows
  behind the number, not every transaction. Pass `formulaKey` to drill into a
  named `secondaryFormulas` entry from `secondaryResults`. Direction is an
  optional in-sheet refinement, not a guess.
- `GET /api/formulas/schema` → drives the playground palette.
- `POST /api/formulas/complete` `{ formula, cursor }` → the Monaco completion
  provider. Reads `completions[].{ label, kind, insert, detail, signature,
replaceRange:{start,end} }`.
- `POST /api/formulas/preview` `{ formula }` → success `{ ok, result:{ value,
displayValue, outputType, referencedCollections }, collections }`, failure
  `{ ok:false, error:{ message, diagnostics:[{ range }] } }`. Used by the
  playground, Author live preview, and a live trend card.
- `GET /api/dashboards` + `PATCH /api/dashboards/:id`
  `{ name?, cardIds?, order? }` → the product home reads dashboards; on a fresh
  workspace it provisions the four curated persona dashboards by PATCH-upserting
  their ids with curated card sets.
- `PATCH /api/dashboards/reorder` `{ ids }` persists display order. Listed ids
  move to the front in that order; omitted dashboards keep their relative order
  after them; unknown ids return `400 unknown_dashboard_ids`. RPC
  `money.dashboards.reorder` mirrors it.
- `DELETE /api/dashboards/:id` removes one dashboard. RPC
  `money.dashboards.list` and `money.dashboards.delete` mirror dashboard list
  and removal for agents. PATCH-on-new-id is still the blessed create path.
- `GET /api/data-health` → `counts.accounts` drives first-run onboarding;
  `dataMode` drives the live/demo badge.
- `GET /api/first-run` is the cheaper onboarding gate:
  `{ accountsConnected, accountCount, connectionCount, dataMode }`. RPC
  `money.data.firstRun` mirrors it.

Notes for backend:

- The UI renders typed values directly (scalar / `series` / `table` /
  `entity-list` / `duration` / `date`), not just `displayValue`. Keeping those
  raw shapes stable matters for charts/drilldowns.
- The Author flow relies on `/api/cards/test` returning `repairHints` and a
  stable `cards[0].error.message`, and on `POST /api/cards` 400ing with
  `{ error:{ message } }` on invalid kind/output mismatch. Keep those stable.
- Drilldown now uses the card-scoped `GET /api/cards/:id/transactions` for
  accurate per-card rows (formula-filtered when possible, else the backing
  collection), rather than the global `/api/transactions` + a direction guess.
- New backend contract available for review workflows:
  `GET /api/transactions/review` / RPC `money.transactions.review`.
- New backend contract detail for review workflows:
  `GET /api/transactions/review/groups` / RPC
  `money.transactions.reviewGroups` apply registry-backed eligible directions
  when `direction` is omitted. For example, `namespace=budget` is expense-only
  by default. Homogeneous merchant-group selectors and taught rules include
  `direction`, so bulk budget choices do not label same-merchant income/refunds.
- Evaluated cards now include inferred primary `outputType`,
  `referencedCollections`, optional `secondaryReferencedCollections`, and
  `secondaryResults`. Each secondary result includes
  `{ formula, value, displayValue, outputType, referencedCollections }`, so
  drilldowns and agents can infer backing facts and validate context formulas
  without reparsing or re-previewing each formula client-side. Ratio formulas
  such as `(Income.Sum() - Expenses.Sum()) / Income.Sum()` and FIRE context
  formulas such as `Assets.Sum() / Expenses.MonthlyAverage(6)` are typed as
  percent/number, not money, unless an explicit output type says otherwise.

## Frontend Sync/ETL UX — contracts now consumed (frontend agent)

The product now has a background-loading/ETL sync UX + per-account sync
(`data/accounts.ts` `useSyncStatusModel`, `components/SyncStatusPill.tsx`,
`AccountsScreen`). It depends on these fields staying stable — please keep them:

- `GET /api/sync/status` → `syncState.status` (`idle`|`syncing`), `syncState.lastSyncAt`
  (UI invalidates dashboards/cards when this advances), `counts`, and per-`items[]`
  `status` (`connected`|`needs_reauth`|`error`) for the per-connection badge.
- `GET /api/warehouse/status` → `busy`/`importing`/`recomputing` drive the
  "Importing transactions…" / "Building your dashboards…" phase labels (best-effort;
  UI tolerates 404 on cold boot).
- `POST /api/connections/:itemId/sync` for per-account "Sync now".
- Sync result semantics the UI relies on: **409** = already-syncing (treated as a
  benign no-op, not an error), **200 + `failedConnections>0`** = partial (data
  refreshed, surfaced as an amber notice via `failedConnections`/`errors`), **502 /
  network** = hard error. `needs_reauth` is routed to reconnect, never a plain retry.

## Frontend Requests For Backend

- 📄 **See `BACKEND.md`** — the running frontend→backend handoff. The P0 Review
  asks there are implemented: teaching/rules loop, correct-in-one-step,
  merchant-grouped review tasks, de-noised recommendations, label vocabulary, and
  product-triggered classify guidance.
- Card authoring + drilldown + the product shell all shipped against existing
  contracts. PATCH-on-new-id is the blessed create/update path for dashboards;
  use `DELETE /api/dashboards/:id` for removal.
- Done: `DELETE /api/dashboards/:id` and RPC `money.dashboards.delete`.
- Done: `GET /api/first-run` and RPC `money.data.firstRun` for the lightweight
  onboarding gate.

## Backend Contracts Ready For UI

- Data mode:
  - `GET /api/data-mode`
  - `PATCH /api/data-mode` with `{ "dataMode": "live" | "demo" }`
- Plaid connect:
  - `POST /api/plaid/connect-session`
  - RPC `money.plaid.connectSession` mirrors connect-session creation for
    agent flows and returns only `{ id, url, redirectUri, expiresAt, mode,
itemId?, productsToAdd?, requestId }` without the Link token.
  - For existing Items that need a new Plaid product, pass
    `{ itemId, additionalConsentedProducts: ["liabilities" | "investments"] }`.
    This creates an update-mode Link session through aivault; do not disconnect
    and reconnect the Item just to request consent.
    Connection/sync rows expose these repairs in `nextActions[]`; if an Item
    needs both liabilities and investments, use the single combined
    `relink-with-optional-products` action rather than opening two update flows
    for the same institution. `nextAction` is only the first action for simple
    clients.
  - RPC `money.plaid.connectSessions` accepts
    `{ sessions: [{ itemId, additionalConsentedProducts }] }` for batched
    planning/execution after data-health returns a consolidated
    `update-plaid-item-consent` action. It still returns one external-browser
    URL per Item and never returns Link tokens.
  - open returned `url` with `moldable:open-url`
  - `GET /api/plaid/connection-check` for non-secret readiness/progress checks
  - New Link sessions default to `country_codes: ["US", "CA"]`; existing
    connected Plaid Items do not need to be disconnected for Canadian banks to
    appear in a new Add bank account flow. Pass explicit `countryCodes` only
    when a narrower country picker is desired.
- Sync status:
  - `GET /api/sync/settings`
  - `PATCH /api/sync/settings`
  - `POST /api/sync/run-due`
  - `POST /api/sync`
  - `GET /api/connections`
  - `POST /api/connections/:itemId/sync`
  - `GET /api/sync/status` returns a safe per-Item sync summary with schedule
    state, product coverage, stored transaction cursor, fact counts, recent raw
    evidence metadata, warnings, per-item `nextAction`, aggregate `nextActions`,
    and backfill limitations. It never returns raw provider responses,
    credential refs, access tokens, or account numbers.
  - `GET /api/raw/plaid` returns recent append-only Plaid sync evidence
    metadata; only request `includeResponses=true` for explicit debugging, not
    for UI/agent card workflows.
  - RPC `money.sync.status` mirrors schedule/due status.
  - RPC `money.sync.history` mirrors the safe `/api/sync/status` history,
    coverage summary, and structured next actions for agent diagnostics.
  - RPC `money.connections.list` returns safe Plaid Item summaries with item
    ids, institution names, statuses, products, cursors, imported fact counts,
    warnings, and next actions. It does not return credential refs or tokens.
  - RPC `money.connections.sync` syncs one Plaid Item by `itemId` and returns
    the standard sync result with counts, cursors, refreshed metrics, and
    structured per-connection errors.
  - RPC `money.connections.delete` revokes one Plaid Item through aivault, then
    clears local item-scoped accounts, transactions, debts, holdings, balance
    snapshots, sync cursor, and dependent materialized metrics. It returns
    removal counts, not credential refs or access tokens.
- Dashboard/cards:
  - `GET /api/cards`
  - `GET /api/cards/readiness?ids=&status=&limit=&offset=&cursor=` returns
    privacy-safe per-card usefulness diagnostics: referenced collections,
    backing transaction counts, extension namespace gaps, proposal-review needs,
    metadata gaps, and repair status. It does not return transaction rows.
    APR-dependent debt cards report `metadataGaps` when open debts/liability
    accounts exist but no positive APR metadata is available; treat that as a
    data/sync/manual-entry task, not a formula-rewrite task.
    Sparse extension next actions such as
    `classify-sparse-extension-candidates` should be treated as the first repair
    move for empty shared/tax/joy cards. Run the returned `params` first; when it
    includes `selector.transactionIds`, those ids are ranked from transaction
    facts rather than merchant regexes. Use `fallbackParams` only if the ranked
    pass finds no useful proposals.
  - `GET /api/cards/templates?category=&ids=&includeEvaluation=&limit=&offset=&cursor=`
    returns curated starter card definitions with category metadata, referenced
    collections, required extension namespaces, use-case tags, and optional
    validation/evaluation output. Use this to populate add-card/template flows;
    saving still goes through preview/test/save.
    Backend regression coverage now asserts that
    `includeEvaluation=true&limit=100` evaluates every seeded starter template
    successfully, so the Author picker should treat failed template tests as a
    backend regression rather than expected data.
    Recurring starter cards use active, deduped series semantics:
    `Subscriptions.Unique(subscriptionKey)` for active count/cost and
    `Subscriptions.DueSoon(45d).Unique(subscriptionKey)` for upcoming renewals.
    Recurring formulas now treat materially stale `active` labels as inactive:
    skipped/dismissed always exclude rows, and rows whose `nextDueDate` is past
    the cadence-aware grace window stop contributing to active
    `Subscriptions`/`RecurringObligations` formulas.
  - `POST /api/cards/test` with `{ cards: [cardDefinition, ...] }` validates
    and evaluates up to 50 proposed cards without writing. Returns aggregate
    `ok`/`passed`/`failed` plus per-card success output or structured error,
    `repairHints`, executable `repairActions`, and aggregate `nextActions`.
  - `POST /api/cards` accepts optional `outputType` and validates primary/secondary formulas
  - `PATCH /api/cards/:id` accepts optional `outputType` and validates primary/secondary formulas
  - `POST /api/cards/:id/refresh`
  - RPC `money.cards.templates.list` mirrors `GET /api/cards/templates`.
  - RPC `money.cards.readiness` mirrors `GET /api/cards/readiness`; use it after
    real imports to decide whether a card is ready, empty, needs labels, needs
    proposal review, or needs formula repair.
  - RPC `money.cards.preview` validates/evaluates a proposed card without writing
  - RPC `money.cards.test` mirrors `POST /api/cards/test` for batch agent
    validation/repair loops.
  - RPC `money.cards.save` validates/evaluates/persists/materializes a card
  - RPC `money.cards.refresh` re-materializes a saved card by id
- Formula authoring:
  - `GET /api/formulas/schema`
  - `POST /api/formulas/complete` with `{ "formula": "...", "cursor": 12 }`
    returns `{ context, completions }` for schema-backed autocomplete. Completion
    items include `label`, `kind`, `insert`, optional `detail`/`signature`, and
    `replaceRange`. The backend is context-aware for expression starts, valid
    next methods after `.`, field arguments for `Where`/`GroupBy`/`Sort`/
    `Unique`/`Top`/`Bottom`/`MinBy`/`MaxBy`, and registry/built-in enum values.
  - RPC `money.formulas.complete` mirrors the same response.
  - `POST /api/formulas/preview`
  - `GET /api/formulas`
  - `POST /api/formulas` validates explicit `outputType` against evaluated result shape
- Allocation targets:
  - `GET /api/allocation-targets`
  - `POST /api/allocation-targets`
- Forecast scenarios:
  - `GET /api/forecast-scenarios`
  - `POST /api/forecast-scenarios`
- Extensions:
  - `GET /api/extensions/registry`
  - `PUT /api/extensions/registry`
  - `GET /api/extensions/values?entity=&entityId=&namespace=&limit=&offset=&cursor=`
  - `POST /api/extensions/values`
  - `PATCH /api/extensions/values/:entity/:namespace/:entityId` patches one
    existing namespaced extension value. `values` merge by default; use
    `replaceValues: true` to replace the values object. `confidence: null`
    clears confidence.
  - `DELETE /api/extensions/values/:entity/:namespace/:entityId` removes one
    existing namespaced extension value.
  - RPC `money.extensions.values.list`, `money.extensions.values.patch`, and
    `money.extensions.values.delete` mirror the extension list/edit/delete
    workflows for agent-built review UIs and card repair loops.
  - Transaction registry entries include `coverage: "exhaustive" | "sparse"`.
    Use `exhaustive` only for labels expected on every eligible row, such as
    `budget.need` over expenses. Use `sparse` for optional annotations such as
    subscriptions, merchant groups, money flows, shared expenses, tax
    contributions, and review actions.
  - `GET /api/extensions/proposals?entity=&entityId=&namespace=&status=&limit=&offset=&cursor=`
    lists pending/accepted/rejected extension proposals saved by classification
    workflows. Proposals do not affect formulas until accepted.
  - `POST /api/extensions/proposals/:id/accept` validates and writes the
    proposal as a normal extension value.
  - `POST /api/extensions/proposals/:id/reject` preserves the audit record but
    keeps it out of formulas.
  - `POST /api/extensions/proposals/decide` accepts, rejects, or corrects a
    bounded batch by ids or filters such as namespace, batch id, model, status,
    and confidence range. Use `dryRun: true` before applying high-confidence
    batches. For one-step correction, send `action: "correct"`, corrected
    `values`, optional `correctedNamespace`, and optional `teachRule: true`; the
    wrong proposal is rejected for audit, the corrected extension value is
    written, and a forward transaction label rule can be taught.
    Non-dry-run transaction proposal decisions return `reviewAfter` counts so
    agents can verify pending/missing namespace state without an immediate
    second review call.
    `money.transactions.labelApply` also resolves pending proposals for the same
    selected transaction namespace: exact value matches are accepted, conflicting
    proposals are rejected as superseded, and the response includes
    `resolvedProposals` plus `proposalCounts`.
  - RPC `money.extensions.proposals.list`,
    `money.extensions.proposals.decide`,
    `money.extensions.proposals.accept`, and
    `money.extensions.proposals.reject` mirror those review queue operations.
- Transaction labeling:
  - `GET /api/transactions/label-plan?namespaces=&includeComplete=&limitPerJob=`
    returns aggregate, privacy-safe labeling jobs by extension namespace. Use it
    after `money.cards.readiness` reports `needs-labels`; it returns counts plus
    ready-to-run selectors/classification requests, not transaction rows.
  - `GET /api/transactions/review?reason=&namespace=&limit=&offset=&cursor=&q=&category=&direction=&startDate=&endDate=`
    returns a paged review queue that joins each transaction with extension
    values, pending proposals, active recommendations, missing namespace
    signals, a ready-to-use label selector, and `labelActions` for supported
    namespaces such as `budget`, `joyReview`, `sharedExpense`, and
    `taxContribution`.
- `GET /api/transactions/review/groups?reason=&namespace=&...` returns
  merchant-grouped review tasks. Budget groups include `suggested.values.need`
  when provider/category data or proposals support it, exclude explicit
  transfer/`moneyFlow` movement and linked-account payments that clearly
  reference connected credit/loan/mortgage/investment accounts, and include
  `notSpendingAction` for durable "not spending" skips. Groups include `impact`
  with amount, months observed,
  average monthly amount, annualized amount, suggested values, and a rollup
  formula hint when applicable. Groups with suggestions include
  `suggestedLabelAction`, a ready-to-run `money.transactions.labelApply`
  preview/apply payload. For budget suggestions it sets `teachRule: true`, so
  confirming a group both labels current matches and teaches future merchant
  matches. Budget group `labelActions` use the same durable path:
  `recommendedRpc: "money.transactions.labelApply"`, `source: "user"`, and
  `teachRule: true`, so Required/Useful/Optional/Waste chips are safe to execute
  directly from the group payload. Groups default to `sort=impact`, which orders
  by annualized dollar impact before proposal count; callers can request
  `sort=priority`, `count`, or `recency` for explicit alternatives. For agent
  triage or dense UI lists, prefer
  `includeTransactions=false&includeTransactionIds=false&transactionSampleLimit=0`;
  request samples only when the user opens a group or an agent needs row evidence.
  Omitted `reason`/`namespace` params are product-safe: REST and RPC normalize
  no-param review-groups calls to
  `reason=missing_namespace&namespace=budget&direction=expense`, so the default
  feed is Categorize budget spending. Use explicit `reason: "has_proposals"`
  for Approve and `money.recommendations.groups` for Flags.
  - RPC `money.transactions.reviewGroups.applySuggestions` previews or applies
    many grouped `suggestedLabelAction` payloads in one call. It accepts the
    same review-group filters, defaults to `dryRun: true`, supports
    `maxGroups` and `minConfidence`, and uses the normal `labelApply` path for
    each selected group. The default response is compact: inspect top-level
    `summary` and per-group `resultSummary`/`values`; pass
    `includeResultDetails: true` only when an agent/UI needs full matched
    transaction evidence for drill-in.
  - `POST /api/labels/transactions` previews/applies transaction extension labels from ids, merchant ids/names, text, category, direction, account, and date selectors
  - `POST /api/classify/transactions` asks the Moldable AI server for structured, registry-backed transaction extension proposals
  - RPC `money.transactions.labelPlan`
  - RPC `money.transactions.review`
  - RPC `money.transactions.reviewGroups`
  - RPC `money.transactions.labelPreview`
  - RPC `money.transactions.labelApply`
  - RPC `money.transactions.classify`
- Fact lists:
  - `GET /api/data-health` / RPC `money.data.health` returns privacy-safe
    aggregate diagnostics for import usefulness: fact counts, direction split,
    cash-flow transfer safety, aggregate provider product coverage,
    extension/proposal coverage, review counts, card evaluation health, a
    compact label-plan summary, next actions, and warning codes. It does not
    return transaction rows, account ids, merchant names, institution names, or
    raw provider payloads. It may return Plaid `itemId` values inside repair
    action params so agents can execute item-scoped sync/update-mode flows. Use
    `nextActions[0]` as the first backend
    repair/classification step after a real import; optional Plaid product gaps
    point to `money.plaid.connectSessions` with `sessions: [{ itemId,
  additionalConsentedProducts }]`. If `providerProducts.accountHints` reports
    `missingProductItems` for `liabilities` or `investments`, the workspace has
    debt- or investment-like account rows but the Plaid Item was stored without
    that product consent. Treat `update-plaid-item-consent` as a Plaid
    update-mode task, not as a card formula repair. The action includes
    executable `params.sessions[]` plus explanatory `items[]` with per-Item
    products, debt/investment account hint counts, and a reason; use
    `params.sessions` for `money.plaid.connectSessions` and `items[]` for UI
    copy or agent planning.
    Pending transaction proposals surface as
    `action: "review-label-proposal-groups"` with
    `rpc: "money.transactions.reviewGroups"`. `params` is the top-namespace
    fast path, `allParams` reviews all pending proposal groups, and
    `namespaceParams[]` gives exact per-namespace payloads with counts. Agents
    should confirm grouped `suggestedLabelAction` payloads instead of listing
    raw proposal rows first. For batch cleanup, call
    `money.transactions.reviewGroups.applySuggestions` with those params,
    inspect the default dry-run summary/failures, then rerun with
    `dryRun: false` only when the selected groups are acceptable.
    All-namespace proposal groups are partitioned by namespace plus merchant,
    so they remain executable.
    `review.namespaces[namespace].has_proposals` is namespace-scoped; a budget
    proposal should not make joy/shared/tax queues
    look like proposal queues. `review.namespaces` is label-work focused:
    only exhaustive namespaces report blanket `missing_namespace`, while
    sparse overlays stay zero unless they have real proposals. Use global
    `review.counts` for broad recommendation/recurring/unlabeled totals.
    `cashFlow.moneyFlowReview` reports large expense rows missing `moneyFlow`
    labels. When `nextActions[0].action === "review-money-flow-candidates"`,
    call the provided `money.transactions.reviewGroups` params and reconcile
    likely transfer principal before trusting expense, cash-flow, or savings-rate
    cards. `cashFlow.moneyFlowResolution` reports labeled money-flow chains that
    are still incomplete or unbalanced. When `nextActions[0].action ===
"resolve-money-flows"`, call `money.moneyFlows.list` with the provided
    params and inspect missing destination, bridge, or fee legs.
  - `GET /api/transactions?limit=&offset=&cursor=&q=&category=&direction=&startDate=&endDate=`
  - `GET /api/transactions/:id` returns one visible transaction for exact
    drilldown/inspection. RPC `money.transactions.get` mirrors it.
  - `GET /api/accounts`
  - `GET /api/debts`; RPC `money.debts.list` mirrors it.
  - `PATCH /api/debts/:id`; RPC `money.debts.patch` creates/updates manual
    APR/payment metadata for an existing debt id or account id.
  - `GET /api/holdings`
  - `GET /api/merchants`
  - `GET /api/merchants/review?status=&minTransactions=&minExpenses=&limit=&offset=&cursor=`
    returns paged merchant grouping review jobs with aggregate grouped/
    ungrouped counts, raw merchant id/name buckets, `merchantGroup`
    `suggestedValues`, and ready-to-run `previewRequest` / `applyRequest`
    payloads for `money.transactions.labelPreview` / `labelApply`. It does not
    return transaction rows.
  - RPC `money.merchants.review` mirrors the merchant grouping review queue.
  - `GET /api/persons`

`GET /api/transactions` is the preferred transaction-list surface for UI
pagination. It returns globally sorted rows with `{ total, limit, offset,
hasMore, nextOffset, nextCursor }`. Existing offset paging still works; cursor
paging uses the opaque `nextCursor` returned by the previous response. Closed
date ranges (`startDate` and `endDate` together) use candidate month shards
server-side, so month/detail views should pass both when possible.

`GET /api/extensions/values` uses the same paging envelope and should be used
for annotation review/editing UIs instead of loading every extension namespace.

Use `money.transactions.labelPlan` before classification/review sweeps. It gives
aggregate namespace jobs and executable selectors like
`{ missingNamespace: "budget", direction: "expense" }`, without exposing rows.
Jobs with `status: "review-proposals"` now recommend
`money.transactions.reviewGroups` and include compact `reviewGroupsRequest` plus
dry-run `applySuggestionsRequest`; use those grouped requests before falling
back to raw proposal lists.
Then use `money.transactions.labelPreview` before batch edits. It returns selected
transaction summaries plus proposed extension values without writing. Preview
and apply responses include `summary` with `matchedTotal`, `selectedTotal`,
`wouldWriteTotal`, `wroteTotal`, `hasMore`, `namespace`, and `dryRun`; use this
for agent assertions before reading row samples. Then call
`money.transactions.labelApply` to persist the same namespace/values and refresh
transaction-backed metrics. Apply responses include `reviewAfter` counts for
affected transaction namespaces: labeled total, missing namespace total, pending
proposal total, and affected-row pending/missing counts. They also include
`resolvedProposals` / `proposalCounts` when applying the label cleared matching
pending proposals. Merchant grouping
should use `selector.merchantIds` with ids from `GET /api/merchants` /
`money.merchants.list`; this labels the matching transactions rather than
mutating raw Plaid transaction fields.
Sparse namespaces normally return `status: "complete"` with `missingTotal: 0`
unless there are pending proposals. Use explicit transaction search, review, or
classification selectors when a user/agent wants to discover optional
annotations such as shared expenses, tax contributions, or money-flow links.
Use `money.merchants.review` first when deciding where to canonicalize
merchants after a real import. It sorts repeated/high-spend ungrouped merchant
buckets first and returns executable label preview/apply requests so agents can
review the impact before writing `merchantGroup` labels.
To canonicalize multiple transaction merchant spellings, label those
transactions with the `merchantGroup` namespace:
`{ merchantId: "canonical-id", name: "Canonical Name", status: "active" }`.
`GET /api/merchants`, `money.merchants.list`, transaction entity-list labels,
and formula aliases `merchant`, `merchantName`, and `merchantId` use the
canonical group when present. Use `status: "dismissed"` to fall back to the raw
provider merchant/name. Applying `merchantGroup` also refreshes rule-derived
`subscription` / `recurringObligation` extensions, so differently named monthly
transactions can become one recurring series after canonicalization.

Use `money.transactions.classify` when agents need semi-autonomous labels. The
product UI may also trigger it from an explicit user action such as "Let agents
categorize". The safest product payload is the `classifyRequest` returned by
`money.transactions.labelPlan` / `GET /api/transactions/label-plan`: it is
already namespace-scoped, direction-scoped where relevant, bounded by
`limitPerJob`, and defaults to `saveProposals: true` plus `apply: false`.
Recommended UI defaults are `limitPerJob`/`maxTransactions <= 50`, model
`openai/gpt-5.5`, `saveProposals: true`, and `apply: false`; then surface the
resulting proposal/review groups for accept, correct, reject, or teach-rule
actions. Agents may use `apply: true` only for explicit autonomous workflows
with a high `minConfidenceToApply` threshold, and should dry-run or save
proposals first for visible product flows.
Classification responses include `summary` with `matchedTotal`, `selectedTotal`,
`proposalTotal`, `savedProposalTotal`, `appliedTotal`, `skippedTotal`,
`saveProposals`, `apply`, and `minConfidenceToApply`. Use these counts to
distinguish proposal writes from formula-visible label writes.
Classification requests use a registry-derived strict JSON schema for the
requested namespaces. If the AI server rejects a request, Money returns the
upstream error detail and records a bounded workspace diagnostic in
`llm-generate-json-failures.jsonl`.

The server sends only selected transaction fields plus registry metadata to the
AI server, validates returned namespaces/fields/enums against the extension
registry, and saves pending proposal records by default. Those proposals become
formula-visible extension values only when accepted explicitly, or when
`apply: true` auto-accepts labels above `minConfidenceToApply`. Pass
`saveProposals: false` only for throwaway experiments. For bulk review, call
`money.extensions.proposals.decide` with `dryRun: true`, then repeat without
`dryRun` to accept, reject, or correct the bounded batch. Use
`action: "correct"` when a human/agent says the proposal is wrong but knows the
right label; add `teachRule: true` to make the correction sticky for future
matching transactions. Do not add broad regex heuristics to the formula engine;
classification should produce auditable extension values that formulas then
consume. Classification responses include `reviewAfter` when proposals are saved
or labels are applied, so agents can confirm whether the target namespace still
has pending proposals or unlabeled affected rows.

For recurring review UIs, treat `subscription.status` and
`recurringObligation.status` as authoritative. `active: false`,
`status: "skipped"`, and `status: "dismissed"` remove rows from active
`Subscriptions` / `RecurringObligations` formula collections even if the raw
transaction was previously inferred as recurring or still has cadence metadata.
Use `Expenses.Where(recurringStatus = "dismissed")` for audit/review views.

## Formula Notes

The formula engine is Langium-backed and does not use `eval`.

Current collection examples:

- `Accounts.Sum()`
- `Merchants.Top(5, expenses)`
- `Expenses.ThisMonth().GroupBy(merchantId).PercentOfTotal()`
- `CardAccounts.Sum()`
- `CreditUtilization(CardAccounts.Where(creditLimit > 0))`
- `Income.ThisMonth().Sum() - Expenses.ThisMonth().Sum()`
- `SavingsRate(Income.Sum(), Expenses.Sum())`
- `SavingsRate(Income.Rolling(6mo).Sum(), Expenses.Rolling(6mo).Sum())`
- `CashFlow.Monthly().Trend().MovingAverage(3)`
- `Income.YTD().Sum() - Expenses.YTD().Sum()`
- `Expenses.Between(2026-01-01, 2026-03-31).Sum()`
- `ChangeVs(Expenses.ThisMonth().Sum(), Expenses.ThisMonth().PreviousPeriod().Sum())`
- `Expenses.Rolling(6mo).Monthly().Trend()`
- `Expenses.Monthly().Trend().MovingAverage(3)`
- `Investments.Monthly().Trend().Cumulative()`
- `Expenses.Sort(date, "desc").Limit(25, 0)`
- `Expenses.Top(5, date)`
- `Subscriptions.ThisMonth().Unique(subscriptionKey).Count()`
- `RecurringObligations.DueSoon(45d).Unique(key).Sum()`
- `Forecast(Expenses.Monthly().Trend(), 3, 0.8)`
- `ForecastScenario(Expenses.MonthlyAverage(6), "default")`
- `DebtPayoff(Debt.Where(balance > 0 and apr > 0), 500, "avalanche")`
- `AllocationDrift(Investments.GroupBy(assetClass).PercentOfTotal(), "funds:90%,cash:10%")`
- `TaxSheltered.Sum()`
- `Investments.Where(taxTreatment = "tax_deferred").Sum()`
- `ReviewActions.Where(status = "required").Count()`
- `Opportunities.Sum()`
- `Warnings.Top(5, severity)`
- `JoyReview.Where(rating = "negative").Sum()`
- `SharedExpenses.Where(status = "owed").Sum()`
- `TaxContributions.Where(type = "hsa").ThisYear().Sum()`
- `TaxContributions.Where(taxContributionSource = "payroll").Sum()`
- `ContributionRoom(TaxContributions.ThisYear())`
- `ContributionRoom(TaxContributions.ThisYear(), "hsa", 2026, "self")`

`CashFlow` is backed by signed transaction rows: income contributes positive
values, expenses contribute negative values, and transfers are excluded. Use it
for trend/drilldown formulas instead of manually joining `Income` and `Expenses`
when a card needs a time series.

Preview returns typed values: scalar numbers/strings/booleans, `series`,
`table`, `entity-list`, `date`, `duration`, or `forecast`. `CreditUtilization`
returns a table with total and per-card rows using balance, credit limit,
available credit, statement balance, and utilization when Plaid exposes those
fields. Forecast values have
`value`, `low`, `high`, `confidence`, `method`, `periods`, `basis`, and optional
`points` and `scenario`. Use `displayValue` from the preview/card APIs for
simple rendering, but preserve raw `value` for charts and drilldowns.
`Runway(cash, monthlySpend)` returns a typed `duration` value with
`amount`, `unit`, and `days`; numeric arithmetic still coerces it to months when
needed.

Formula diagnostics now statically validate method chains before evaluation:
collection methods may produce collection/scalar/table/series values, table
values only support `PercentOfTotal()`, series values only support
`MovingAverage()` and `Cumulative()`, and scalar values cannot be chained.
Domain function calls also validate arity and statically-known argument shapes
before preview/save: `AllocationDrift` needs a table, `ContributionRoom`,
`CreditUtilization`, and `InterestDrag` need collections, and `Forecast` /
`ForecastScenario` need a number or series as their first argument. Card saves
also validate `kind` against the materialized output type, e.g. a `trend` card
must use `series` or `forecast`, while `breakdown` requires a `table`.

Investment accounts normalize to `investmentAccountKind` (`brokerage`, `401k`,
`ira`, `roth_ira`, `rrsp`, `tfsa`, `hsa`, `529`, `other`) and `taxTreatment`
(`taxable`, `tax_deferred`, `tax_free`, `education`, `hsa`, `other`). Holdings
inherit these fields from their parent account when available. Accounts also
normalize to `liquidityTier` / `liquidity` / `liquidityClass`; use
`LiquidAssets`, `IlliquidAssets`, or account filters such as
`Accounts.Where(liquidityClass = "liquid")` for liquidity-aware formulas.

Recommendation/action facts live in `recommendations.json` and are first-class
formula rows, not transaction-only annotations. `ReviewActions`, `Warnings`, and
`Opportunities` support fields such as `kind`, `status`, `severity`,
`estimatedImpact`, `scenarioId`, `sourceEntity`, and `sourceEntityId`. Status
can be patched through `PATCH /api/recommendations/:id`; use
`GET /api/recommendations` or RPC `money.recommendations.list` for handoff.
For de-noised review, use `GET /api/recommendations/groups` or RPC
`money.recommendations.groups`; groups support `groupBy: "merchant" | "source" |
"kind"` and include compact `bulkActions` with ready status-update payloads.
Default group responses omit recommendation ids, source links, and sample rows;
use `includeRecommendationIds`, `includeSourceLinks`, `includeRecommendations`,
and `recommendationSampleLimit` only for drill-in. Bulk actions use
`{ groupBy, groupId, currentStatus, status }`, so apply them through
`PATCH /api/recommendations` or RPC `money.recommendations.patch` to mark exactly
the visible repeated warnings/opportunities done, ignored, or rejected in one
bounded operation.

Grouped recurring facts are available through
`GET /api/recurring/series` and RPC `money.recurring.series`. Use this surface
for subscription and recurring-obligation review UIs because it groups
transaction-level recurring labels into series, supports `namespace`, `status`,
`dueWithinDays`, `minConfidence`, and bounded paging, and returns a
`labelSelector` plus executable `reviewActions.activate/skip/dismiss` payloads
for `money.transactions.labelPreview` / `money.transactions.labelApply`.
Supported `status` filters are `active`, `stale`, `skipped`, `dismissed`, and
`all`. `stale` means the latest `nextDueDate` is older than the cadence-aware
grace window; weekly/monthly series use a short grace window, while
quarterly/yearly series get a longer one to avoid noisy false stale states.
Stale series remain reviewable through the series API but no longer contribute
to active recurring formulas or default subscription cards.

`ForecastScenario(valueOrSeries, scenarioId?, periods?)` applies persisted
scenario changes from `GET /api/forecast-scenarios`. Draft and accepted changes
are included; rejected and archived changes are counted but not applied.
Scenario definitions live in `semantic/forecast-scenarios.json` and are exposed
through `/api/formulas/schema`.

`DebtPayoff(collection, monthlyBudget?, strategy?)` returns a `table` when the
first argument is a debt collection. Rows include priority, balance, APR,
minimum/monthly payment, payoff months/years, interest estimate, due date, and
overdue status. Supported strategies are `"avalanche"`, `"snowball"`, and
`"highest-balance"`. Passing a scalar such as `DebtPayoff(Debt.Sum())` still
returns a scalar.

Investment holdings normalize provider security types into formula-facing
`assetClass` values: `stocks`, `bonds`, `cash`, `crypto`, `funds`, `options`,
or `other`. `AllocationDrift(table, target?)` expects a grouped allocation
table, usually `Investments.GroupBy(assetClass).PercentOfTotal()`, and returns a
table with actual percent, target percent, drift, and rebalance amount rows.
Targets can be persisted target ids such as `"default"` / `"retirement"` from
`GET /api/allocation-targets`, or explicit strings like
`"funds:90%,cash:10%"` and `"stocks:0.80,bonds:0.20"`.

When saving formulas or cards, explicit `outputType` values must match the
evaluated result shape. Cards also validate every `secondaryFormulas` entry
before persistence.

For agent-authored cards, prefer the Moldable RPC loop over direct REST writes:
call `money.formulas.schema`, draft one or more cards, call `money.cards.test`,
heal any structured diagnostics with `money.formulas.complete` and
`money.cards.preview`, call `money.cards.save` for passing cards, then call
`money.cards.refresh` after relevant source data changes.
`money.cards.preview/test/save/refresh` return enough structured output for
agents to assert the API response before touching UI. Successful card responses
include `card.secondaryResults` for evaluated context formulas. Failed preview/save/test
responses include `repairActions` with RPC method names and params, so agents
can call formula completion/preview/card preview/card test without parsing hint
text. `money.cards.test` includes a small `drilldown` preview for
transaction-backed primary formulas plus `secondaryDrilldowns` keyed by
secondary formula name, so agents can verify the rows behind a generated card
and its context formulas, not just scalar display values.
For grouped table formulas such as `Expenses.GroupBy(category).PercentOfTotal()`,
use each row's `label` for display and each row's `key` for stable identity,
filters, drilldowns, and agent actions. Provider enum keys remain raw, while
labels are humanized; for example, `FOOD_AND_DRINK FOOD_AND_DRINK_GROCERIES`
displays as `Groceries`.
After imports or relabeling, call `money.cards.readiness` before changing card
formulas. A `needs-labels` or `needs-review` status means the next useful step is
classification/proposal review, not formula churn. `namespaceGaps` are scoped to
the namespace's eligible transaction set; for example, expense-only extensions
such as `sharedExpense`, `subscription`, and `budget` do not count income or
transfer rows as missing labels. Sparse namespaces do not create missing-label
debt merely because rows lack that annotation; cards depending on sparse
namespaces are `empty` until matching labels or pending proposals exist. Debt
optimizer/interest cards are also `empty` until positive APR facts exist; the
formula engine may still use account-liability fallbacks for balance math, but
readiness reports `metadataGaps` so agents do not present unknown-APR rows as
high-APR or `$0 interest` insights.
Each readiness card can include `nextActions`; prefer these over guessing. Empty
debt/APR cards may point to `money.plaid.connectSession` with
`itemId` and `additionalConsentedProducts: ["liabilities"]`,
or to manual metadata entry through `money.debts.patch` when the user/agent
knows APR, minimum payment, balance, or due date. `money.debts.patch` accepts an
existing debt id or account id; new account-derived manual debt metadata stores
`accountId` without claiming Plaid item ownership, so future syncs do not delete
it if liabilities still return nothing.
investment-history cards may point to `itemId` and
`additionalConsentedProducts: ["investments"]`, recurring cards may point to
`money.recurring.series`, merchant cards may point to `money.merchants.review`,
and sparse extension cards may point to `money.transactions.classify` with
bounded, proposal-first params (`saveProposals: true`, `apply: false`).

For card drilldowns, call
`GET /api/cards/:id/transactions` or RPC `money.cards.transactions`. The route
applies formula-shaped filters for single collection method chains, supports
`formulaKey` for named secondary formulas plus an explicit `collection`
override, and returns bounded transaction pages with
`limit`/`offset`/`cursor`. Check `drilldownBasis`: `formula` means the rows were
filtered by supported formula methods such as `Where`, date windows, `DueSoon`,
`Unique`, `Sort`, `Top`, `Bottom`, `Limit`, and `Offset`; `collection` means the
formula was arithmetic/multi-collection/otherwise not row-explainable and the
route fell back to a referenced collection. Built-in transaction collections
(`Income`, `Expenses`, `CashFlow`) and registry-backed transaction extension
collections such as `Subscriptions`, `RecurringObligations`, `SharedExpenses`,
`JoyReview`, `TaxContributions`, and `BudgetLabels` are supported.

For transaction review UIs or agent labeling loops, start with
`money.transactions.review` or `GET /api/transactions/review`. Use
`reason=has_proposals` to review classifier output, `reason=missing_namespace`
with `namespace=budget`/`joyReview`/`sharedExpense`/etc. to find unlabeled rows,
and `reason=recurring` for subscription/obligation review. Feed each returned
`labelSelector` into `money.transactions.labelPreview` or
`money.transactions.labelApply`; when `labelActions` are present, use their
ready-to-run preview/apply payloads rather than hand-authoring common extension
values. For budget merchant groups that are money movement rather than spend,
call the returned `notSpendingAction.applyRequest`; it applies
`moneyFlow.role = "ignored"` with `teachRule: true`, removing current and future
matches from budget categorization. Do not mutate extension files directly.

Formula diagnostics now validate collection field references for filters,
grouping, sorting, uniqueness, and min/max field selectors. This includes
entity-specific fields and extension-backed fields such as
`JoyReview.Where(rating = "negative").Sum()`.

Transfer handling is part of the money model, not a UI concern. Structured Plaid
`TRANSFER_IN`, `TRANSFER_OUT`, and `LOAN_PAYMENTS_CREDIT_CARD_PAYMENT` rows are
normalized to `direction: "transfer"` on import and read, so `Income`,
`Expenses`, cash-flow, and savings-rate formulas exclude credit-card payments
and internal movement. Keep future ambiguous classification in LLM-backed
extension/tagging workflows with review, not broad regexes inside the formula
engine.
For large ambiguous expense rows that may be transfer rails, use
`cashFlow.moneyFlowReview` from `money.data.health`, then
`money.transactions.reviewGroups` with the returned params. A confirmed merchant
or pattern can be applied through `money.transactions.labelApply` with
`namespace: "moneyFlow"`, `values.role: "transfer"`, and `teachRule: true`.
After labeling transfer principal, use `cashFlow.moneyFlowResolution` or
`money.moneyFlows.list { status: "needs-review" }` to find chains that still
need the destination account, bridge leg, or fee detail before treating the
transfer path as fully reconciled. Each unresolved flow includes structured
`nextActions` with bounded `money.transactions.search` params plus a
`labelTemplate`; missing source/destination actions also include per-leg
`candidateSearches` so multi-row cross-border transfer rails can be resolved one transfer at a
time. Each candidate search includes ready-to-run `previewRequest` and
`applyRequest` payloads for `money.transactions.labelPreview` /
`money.transactions.labelApply`; run preview first, inspect the matching rows,
then apply only when the matching leg is clear.
For broad scans, prefer
`money.moneyFlows.list { status: "needs-review", includeTransactions: false, includeTransactionIds: false, includeCandidateSearches: false, candidateSearchLimit: 0 }`.
When `money.data.health` returns `resolve-money-flows`, use its compact `params`
for the scan and its `drilldownParams` when you are ready to fetch candidate
searches/matches for repair.
That returns flow totals, warnings, counts, `labelSelectorSummary`, and
next-action counts without row samples or raw transaction id selectors; fetch
one `flowId` with samples/candidate searches, or set `includeTransactionIds=true`,
only when resolving it.
For cross-currency rails, prefer a `find-cross-currency-destination-leg`
next action when present. It searches nearby transfer rows in linked
non-source currencies such as CAD without source-currency amount bounds, so FX
conversion does not hide the receiving leg.
When that action includes `candidateMatches`, prefer those exact ranked
transaction candidates over broad search selectors. Each match carries locked
target amount/currency labels plus one-row `previewRequest` and `applyRequest`
payloads, so an agent or UI can validate/apply the destination leg without
guessing from raw files.
When it also includes `candidateMatchGroups`, use those groups for multi-row
rails: each group is keyed by the closest source/transfer leg and contains exact
destination candidates with preview/apply payloads. This lets an agent or UI
repair one transfer leg at a time and avoid applying a flat candidate list as
one ambiguous bulk action.
If the receiving account is owned by the user but not linked yet, such as a
cross-border transfer into an external Canadian bank, do not invent a destination
row. Use the unresolved flow's `mark-unlinked-owned-destination` next action,
which calls `money.moneyFlows.markExternalDestination`. The RPC supports
`dryRun`, chooses or validates the source/transfer leg, merges
`moneyFlow.destinationKind = "unlinked_owned"` without clobbering the rest of
the flow label, and returns the lower-level extension patch request for audit.
The listed next action uses `dryRun: true`; explicitly set `dryRun: false` only
after confirming there is no linked destination leg to label.
That yields `money.moneyFlows.list` status `"external"` with
`needsReview: false`, while the principal remains a transfer excluded from
expenses.

Reporting-currency rollups are formula-time normalized for money facts. When
`settings.currency.reportingCurrency` is set and a matching stored FX rate
exists, runtime account, transaction, debt, holding, and balance snapshot rows
carry `reportingCurrency`, `reportingValue`, `reportingValueStatus`,
`reportingFxRate`, `reportingFxAsOf`, and `reportingFxSource`; formulas such as
`Expenses.Sum()`, `Accounts.Sum()`, and `Debt.Sum()` use those reporting values.
Locked `moneyFlow.reportingValue` still wins for settled cross-currency flows.
If no FX rate exists, the row keeps its original amount and does not receive
invented reporting metadata; agents should add rates through `money.fxRates.replace`
or ask the user to provide them.

## Extension Notes

Extension values are sharded by entity and namespace under workspace data:

```text
extensions/transactions/{namespace}.json
extensions/accounts/{namespace}.json
extensions/holdings/{namespace}.json
extensions/debts/{namespace}.json
extensions/merchants/{namespace}.json
extensions/persons/{namespace}.json
```

The registry advertises field labels, field types, formula aliases,
derived collections, examples, and validation hints. The current executable
extension collections are:

- `Subscriptions`
- `RecurringObligations`
- `JoyReview`
- `SharedExpenses`
- `TaxContributions`
- `BudgetLabels`

Registry-derived extension collections are executable for `transaction`,
`account`, `debt`, `holding`, `merchant`, and `person` entities. For those
collections, rows are selected by namespace presence and formulas can filter on
extension fields via plain field names inside the collection, e.g.
`DebtPlans.Where(priority = "high").Sum()`, or namespace-prefixed fields such
as `payoffPlan_priority`. Extension numeric measures use `amount`,
`monthlyAmount`, or `percent` against the row's base value.

Generic extension writes validate namespace/entity, required fields, enum
values, dates, finite numbers, percentages, booleans, and strings against the
registry. Transactions are ordinary generic extension values with
`entity: "transaction"` and `entityId` equal to the transaction id.

Recurring facts are derived-first extensions:

- Repeated stable expense merchants are classified into `subscription` or
  `recurringObligation` transaction extension shards.
- Rule-derived facts include `key`, `cadence`, `monthlyAmount`,
  `intervalDays`, `lastDate`, `nextDueDate`, `need`, `status`,
  `confidence`, `observedCount`, `firstDate`, and
  `amountVariancePercent`.
- User/agent/provider extension values win over rule-derived values for the
  same transaction namespace; stale rule-derived recurring labels are cleared
  on the next raw-data write.
- Recurring formulas also ignore materially stale `active` labels at read time,
  so old inferred subscriptions do not inflate `Subscriptions.Unique(...).Count()`
  or monthly cost cards between sync/import writes.
- Use `DueSoon(duration?)` with `Unique(key)` / `Unique(subscriptionKey)` for
  forecast cards, e.g. `RecurringObligations.DueSoon(45d).Unique(key).Sum()`.
- Use `recurringConfidence` or collection-local `confidence` to filter noisy
  recurring guesses, e.g.
  `Subscriptions.Where(recurringConfidence >= 0.8).Unique(subscriptionKey).Sum()`.
- Use `GET /api/recurring/series` or RPC `money.recurring.series` for grouped
  review/listing. Keep card math in formulas; use the series API when agents or
  UI need grouped metadata, due dates, counts, batch label selectors, and
  activate/skip/dismiss review actions.
  For broad scans, pass `includeTransactionIds=false` and
  `includeReviewActions=false`; that returns `labelSelectorSummary` and
  `reviewActionSummary` only. Fetch one series with transaction IDs enabled
  before applying activate/skip/dismiss actions.

Tax contribution facts are also derived-first extensions:

- High-confidence transaction names/categories such as 401k/403b deferrals,
  IRA contributions, HSA contributions, and 529 contributions materialize
  `taxContribution` transaction extension shards.
- Rule-derived tax facts include `type`, `taxYear`, `amount`, and
  `contributionSource` (`payroll`, `employer`, or `transfer`).
- User/agent/provider `taxContribution` values win over rule-derived values for
  the same transaction. Use `contributionSource` inside `TaxContributions`, or
  `taxContributionSource` as the alias in formulas.
- Contribution-limit facts live in `semantic/tax-contribution-limits.json` and
  are exposed through `GET /api/tax-contribution-limits`, POST upserts, RPC
  `money.taxContributionLimits.list`, and `/api/formulas/schema`.
- `ContributionRoom(collection, type?, taxYear?, variant?)` joins
  `TaxContributions` to those limits and returns a table with `used`, `limit`,
  `remaining`, `utilization`, and source metadata. Seeded 2026 defaults cover
  401(k), IRA, HSA self-only, and HSA family limits; 529 is taggable but has no
  universal default annual room.

Merchant and person catalogs are derived-first facts:

- `GET /api/merchants`
- `GET /api/merchants/review`
- `GET /api/persons`
- RPC: `money.merchants.list`, `money.merchants.review`,
  `money.persons.list`,
  `money.sync.status`, `money.sync.history`, `money.connections.list`,
  `money.connections.sync`, `money.connections.delete`,
  `money.allocationTargets.list`, `money.forecastScenarios.list`,
  `money.taxContributionLimits.list`,
  `money.recommendations.list`, `money.recurring.series`,
  `money.transactions.labelPlan`,
  `money.transactions.review`,
  `money.cards.readiness`,
  `money.cards.transactions`,
  `money.extensions.values.list`,
  `money.extensions.values.patch`, `money.extensions.values.delete`,
  `money.extensions.proposals.list`, `money.extensions.proposals.decide`,
  `money.extensions.proposals.accept`,
  `money.extensions.proposals.reject`

Merchants derive from visible transaction merchant/name fields plus optional
transaction `merchantGroup` extensions for canonical grouping. Persons derive
from shared-expense `personId` extension values and explicit person extension
values.

Merchant review is de-noised. `GET /api/merchants/review?status=needs-group`
and RPC `money.merchants.review` now only return structural canonicalization
candidates where multiple raw merchant ids/names collapse to the same normalized
candidate group. Stable single-name merchants are reported as `grouped` so the
review queue does not ask the user/agent to approve hundreds of no-op merchant
labels. Each actionable item still returns raw ids/names, samples, and
`previewRequest` / `applyRequest` payloads for `merchantGroup`.

Historical balances are stored as monthly shards under
`balance-snapshots/YYYY-MM.json`. Each sync/import upserts account rows,
holding rows, and aggregate rows for `netWorth`, `assets`, `liabilities`, and
`investment`.

Historical persisted snapshot shards are authoritative, but reads always merge a
current snapshot set from visible account/holding facts. Current facts replace
same-id rows and same-day aggregate snapshots, so `NetWorthHistory` and related
trend cards cannot disagree with `Accounts.Sum()` because of stale aggregate
shards. The current merge omits the `investment` aggregate unless there are
holdings or investment-like accounts. Investment-like account detection uses the
normalized account kind, so IRA/RRSP/brokerage-style balance rows can power a
basic `InvestmentHistory` trend before Plaid investments product detail imports
security holdings.

Use snapshot-backed collections for balance trends:

- `NetWorthHistory.Monthly().Trend()`
- `AssetHistory.Monthly().Trend()`
- `LiabilityHistory.Monthly().Trend()`
- `InvestmentHistory.Monthly().Trend()`
- `BalanceSnapshots.Where(kind = "account").Top(20, date)`

`Trend()` uses latest snapshot value per period for balance snapshot rows;
transaction-like collections still sum rows per period. Use
`GET /api/balance-snapshots` or RPC `money.balanceSnapshots.list` with
`kind`, `startDate`, `endDate`, `limit`, `offset`, and `cursor` for paged
underlying fact access.

Debt interest formulas:

- `InterestDrag(Debt.Where(balance > 0 and apr > 0))` returns estimated annual
  interest cost using each known-APR debt row's normalized `balance * apr`.
- `InterestDrag(Debt.Where(balance > 0 and apr > 0), "monthly")` and `"daily"`
  return periodized cost.
- APR accepts decimal (`0.22`) or percent-style (`22`) values.
- Manual APR/payment metadata can be written with
  `PATCH /api/debts/:id` or RPC `money.debts.patch`. Use an account id when
  Plaid has imported the liability account balance but not liabilities product
  detail.

Debt payoff formulas:

- `DebtPayoff(Debt.Where(balance > 0 and apr > 0), monthlyBudget, "avalanche")`
  runs the default APR-aware multi-debt rollover simulation. It accrues monthly
  interest, pays minimums, applies extra budget to the current priority debt,
  and rolls freed budget to the next debt after payoff.
- `DebtPayoff(Debt.Where(balance > 0), monthlyBudget, "avalanche")` remains
  valid for explicitly user-authored balance-only payoff experiments, but
  default dashboard cards should require known positive APR.
- Strategies: `"avalanche"`, `"snowball"`, `"highest-balance"`.

## Backend Verification Last Run

Last app-local Money validation focused on debt/APR readiness and card authoring:

```bash
pnpm exec vitest run src/server/formulas.test.ts -t "debt payoff|APR|default cards|FIRE"
pnpm exec vitest run src/server/index.test.ts -t "seeds raw data and returns evaluated cards"
pnpm exec vitest run src/server/index.test.ts -t "previews and persists formula-backed cards and dashboards"
pnpm exec tsc --noEmit --pretty false
pnpm lint
```
