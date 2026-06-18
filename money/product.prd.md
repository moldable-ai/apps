# Moldable Money — Product PRD & Honest Inventory

The **real consumer app** lives at `/` (`src/client/product/**`). `/admin` (the old
console) and `/ui-kit` (the design surface) are **debug/reference only** — not part
of the shipping product. This doc is the single source of truth for what the
product needs and what actually works. Keep it honest: only check a box when the
flow works end-to-end in the product and has been verified.

Legend: `[x]` done & verified · `[~]` partial / built but not wired or unverified ·
`[ ]` not built.

> **2026-06-04 live verification pass** (app relaunched): Dashboards single-scroll +
> reorderable pills (render, click-to-jump, scroll-spy all confirmed), per-dashboard
> Edit mode (rename input + per-card × remove render), Review Categorize segment
> (need chips + teach copy), Review **Subscriptions** segment (sample monthly total, Skip/Cancel),
> Activity date filters + **transaction detail sheet**, Accounts net-worth — all
> verified in-browser. **One bug found & fixed:** the transaction detail sheet
> crashed on `formatDate(..., {dateStyle})` (can't combine with the default
> month/day/year) → now `{weekday:'short'}`. Frontend toolchain green (types/lint/
> build). NOTE: the shared `pnpm test` suite is currently red due to the **backend
> agent's** in-progress `latestRuntimeAnchorDate is not defined` in
> `src/server/formulas.test.ts` — not frontend, not touched.

## 1. FTUE / Onboarding

- [x] Install-a-dashboard carousel with demo-data previews (`OnboardingCarousel`)
- [x] Install → app shows installed dashboards on sample data
- [x] Per-dashboard `DEMO` badge while on sample data
- [x] Persistent "connect your first account" banner (`ConnectBanner`)
- [x] Existing users (already connected) skip the carousel
- [x] Banner/carousel connect opens the in-product `ConnectDialog` (no `/admin`)
- [~] Connect completes a NEW institution end-to-end — flow reaches the secure
  external handoff + polls for the new connection; **not yet verified through a
  real bank login** (needs the external browser step).
- [x] Post-connect celebration / "your real numbers are in" transition —
      one-time overlay (canvas confetti + animated seal + real account/transaction
      counts) that fires when demo data flips to a connected account
      (`PostConnectCelebration`, `useCelebrated`). Screenshot-verified via
      `?celebrate`. Fires on the demo→live transition, once per workspace.
- [x] **Connect now triggers the initial sync** — adversarial review caught that
      `complete-link` only marks the item _connected_ (no import), so the product's
      inline connect silently no-op'd (stuck in demo). Fixed: on connect success
      (`ConnectDialog onConnected` → `handleConnected`) the app kicks
      `sync.runAll()` and enters the setup state. _(Wiring verified; the real Plaid
      handoff not auto-fired — SMS.)_
- [x] **First-sync "Setting up your money"** — a full-screen takeover (Sparkles
      seal + live phase label "Importing transactions…" / "Building your
      dashboards…" + skeleton bento) shown from connect-success until the first
      cards materialize (`FirstSyncSetup`, `setupActive` gate; exits on cards-land
      or pass-complete). `?setup` preview screenshot-verified; existing users never
      flash it (explicit gate, no `sync.busy` heuristic).
- [ ] Empty state if zero dashboards installed

## 2. Accounts & Connections (`AccountsScreen`, `data/accounts.ts`)

- [x] Accounts screen reachable from the home header ("N accounts")
- [x] List connected institutions with status + last-synced (relative time)
- [x] List accounts per institution (name, type, mask, balance) — verified against a linked institution
- [x] Add another account → inline `ConnectDialog`
- [x] Manual "Sync all" — **executed live & verified** (`POST /api/sync` →
      `ok:true`, one connection synced, account/transaction facts refreshed, metrics refreshed,
      0 errors; UI updated to "synced just now"). No SMS — existing-item refresh.
- [~] Disconnect an institution — wired w/ confirm (`DELETE /api/connections/:itemId`);
  **not live-verified** (won't disconnect the real linked institution to test)
- [x] **Per-connection "Sync now"** — each connection card has a Sync button
      (`POST /api/connections/:itemId/sync`). **Live-verified**: syncs just that
      institution, shows a "Syncing…" badge + spinner on the card, and — because
      the sync lock is workspace-wide — disables every sibling Sync button +
      "Sync all" while any sync runs.
- [x] **Background ETL / processing UX** (per user feedback: "more of an ETL setup… make the
      loading state nice for new accounts syncing / new syncs processing").
      `useSyncStatusModel` polls `/api/sync/status` (extract leg) **and**
      `/api/warehouse/status` (async load/materialize leg) — fast (1.8s) while
      active, slow (25s) idle — so background/scheduled/agent syncs are noticed,
      not just button-presses. A global **`SyncStatusPill`** in the dashboards rail
      shows "Updated 4m ago" (amber when stale) → "Syncing your accounts…" /
      "Importing transactions…" / "Building your dashboards…" → "Updated just now",
      and **auto-invalidates every money/ui-kit query on completion** so dashboards
      refresh with fresh data. Optimistic so it appears with zero lag.
      **Live-verified** end-to-end (idle → syncing → done, pill + header + card +
      dashboards all in sync).
- [x] Per-connection error / reconnect state — 3-state badge
      (`connected` / `needs_reauth` → "Reconnect" / `error` → "Needs attention").
      **Reconnect opens an update-mode Plaid Link** for the existing item
      (`useReconnect` → `POST /api/plaid/connect-session { itemId }`), never a
      disconnect+re-add and never a plain retry. User-initiated only (it texts a
      code), so wired + UI-verified but the handoff itself not auto-fired.
- [x] **Sync-result toasts** — bespoke dependency-free toaster (`Toaster`,
      `showToast`): success "You're up to date · N cards refreshed" / per-account
      "Account synced", partial "Synced with issues · N couldn't update", error
      "Couldn't sync". Fires only on user-initiated syncs (not the 409
      already-syncing no-op, not background polls). Live-verified.
- [x] Auto-refresh schedule settings (`/api/sync/settings`) — Settings → Syncing
- [x] Total balances / net-worth summary across accounts (Accounts header)
- [x] Shared `timeAgo()` helper in `ui-kit/lib/format` (de-duped the two
      per-screen `relativeTime` copies)

Backend ready: `GET /api/connections`, `DELETE /api/connections/:itemId`,
`GET /api/accounts`, `GET /api/sync/status`, `POST /api/sync`,
`POST /api/sync/run-due`, `GET|PATCH /api/sync/settings`,
`POST /api/plaid/connect-session` → `{ url, id }` (opens `/plaid/connect?session=`
in an external browser; OAuth returns to `/plaid/oauth-return`),
`POST /api/plaid/complete-link`, `GET /api/plaid/connection-check`,
`GET /api/plaid/status` (capabilities).

## 2c. Account roll-up cards, manual assets & drill-down nav (new feature work)

Per the user: simple at-a-glance roll-up cards + the ability to tap a rolled-up value
and drill into what made it up (a push/pop nav stack).

> **Architecture correction (per user feedback):** the first cut shipped these roll-ups as
> bespoke React components (`CreditCardsCard`, `AssetsLiquidityCard`) that summed
> `/api/accounts` client-side. the user caught it: _"there's no formula on their
> backs… did you hard code these? that's definitely an anti-pattern."_ Correct.
> Both were **deleted** and replaced with **formula-backed, flip-to-inspect cards
> in `/api/cards`** — same as every other card. The product only _reflects_ them.

- [x] **Credit card balances → the seeded `credit-utilization` card**
      (`CreditUtilization(CardAccounts.Where(creditLimit > 0))`) — per-card balance,
      limit, available, and utilization as a formula table. Already on the Debt
      persona; added to **Overview**. No bespoke component. **Verified live** on
      Overview ("Credit Utilization", a live total, per-card rows, ƒ inspect).
- [x] **Liquid vs illiquid assets → the seeded `liquid-vs-illiquid` card**
      (`Accounts.Where(isAsset = true).GroupBy(liquidityClass).PercentOfTotal()`,
      secondaries `LiquidAssets.Sum()` / `IlliquidAssets.Sum()` /
      `LiquidAssets.Sum()/Assets.Sum()`) — the backend now derives account-level
      **liquidity** once (a `liquidityTier` 0–3 + `liquidity` label + `liquidityClass`
      projection, computed like `investmentAccountKind`/`taxTreatment`) and exposes
      it to formulas, `/api/accounts`, and the `LiquidAssets`/`IlliquidAssets`
      collections — durable enough to later power runway / available-now / FIRE
      cards. This is the **true** answer to the user's "what money is actually
      available," and it **replaced the interim `assets-by-type` card** on
      **Overview** and **FIRE** (`personas.ts` swap + `PATCH /api/dashboards/:id`).
      **Verified live** on Overview: "Liquid vs Illiquid" shows a liquid/illiquid split and flips to the `GroupBy(liquidityClass)` formula.
      (The interim `assets-by-type` card — `GroupBy(subtype)` — is no longer on any
      dashboard; its definition is left orphaned in the workspace, harmless.)
- [x] **Manual accounts** (`ManualAccountForm`, `useAddManualAccount` / update /
      delete) — add something Plaid can't see as a proper **manual account, asset
      OR liability**, with a name, value, and an **"as of" date**
      (`POST/PATCH/DELETE /api/accounts`; liabilities stored negative). It flows
      into `Accounts.Sum()` / net worth and the `liquid-vs-illiquid` breakdown like
      a real account. Per the user's refinement, **creation/editing lives only on the
      Accounts page** ("Manual accounts" section) — the dashboard cards just
      reflect them (no creation UI on cards). **Verified E2E live**: a representative manual real-estate asset shows in net worth and inside formula-backed asset cards; a representative manual mortgage liability also updates net worth and preserves its "as of" metadata.
- [x] **Drill-down nav stack** (`DrilldownDrawer`) — a right drawer with a level
      stack: tap a rolled-up row → push its constituents, keep tapping to push
      deeper, back-button pops. Powers: bucket → accounts → account detail; credit
      card → detail; **grouped expenses** (formula breakdown rows are now tappable
      via `BarList.onItemClick` → `RendererProps.onDrillRow` → category-scoped
      `/api/cards/:id/transactions`). **Verified live** (a category bucket → paged transactions; Liquid → accounts → account detail with back).
- [x] **New cards added to personas, not the codebase** (`personas.ts`): Overview
      gained `liquid-vs-illiquid` + `credit-utilization`; FIRE gained
      `liquid-vs-illiquid`. Provisioned to local live dashboards via
      `PATCH /api/dashboards/:id` (+ a `POST /api/warehouse/rebuild` to materialize
      the card in the existing workspace, since `DEFAULT_CARD_DEFINITIONS` only
      seeds _new_ workspaces). No `DashboardGrid` injection path — cards render
      through the normal `/api/cards` → `CardRenderer` pipeline. Chat safe-area
      padding kept on
      the drawer scroll area.
- [x] **Adversarial-review hardening** (16-agent review, 11 findings fixed):
      most landed on the now-deleted bespoke cards; the survivors are the ones that
      moved into shared paths — mixed-currency handling now lives in the formula
      engine's reporting-currency normalization (client prefers `reportingValue`,
      BACKEND.md ask filed for FX on `/api/accounts`); per-account **currency
      glyphs** (CAD `CA$`) on the Accounts screen; row-drill **gated to category
      breakdowns** (assetClass/person groupings no longer fire a bogus
      `?category=`); manual-account **delete confirmation**; drawer `aria-live` +
      spinner role; AccountsScreen net-worth uses signed `valueForSum`/
      `reportingValue` like the cards.

## 3. Dashboards (`DashboardsView`)

Redesigned per user feedback: **one scrollable view of all dashboards** with a sticky pill
rail (scroll-spy + click-to-jump + **drag-to-reorder**, first = default). Replaced
the rollup-home + drill-in detail + host-nav back. Section-header icons are now
clean line glyphs (the heavy `bg-muted` icon chips were removed per user feedback).

- [x] Single scroll of all dashboards (full masonry of cards each)
- [x] **Bento grid** (rebuilt twice per user feedback: free-form masonry always gapped
      because cards had "incompatible sizes"). The fix is a **quantized size
      palette** on a fixed-row grid: a **small** tile (1 block) and a **big** tile
      (exactly 2 blocks), 1 or 2 columns wide — so every piece is commensurate and
      `grid-auto-flow: dense` tessellates with no orphan holes. Stats/gauges/
      durations = 1×small; charts/breakdowns = 2-wide big; lists = 1-wide big (so
      they fill the column beside a wide card). Cards fill their tile (`h-full`);
      `overflow-hidden` + content caps (breakdown = top 4 + Other) keep content in
      bounds so nothing collides with the next section. Verified across Overview /
      FIRE / Cash Flow — gap-free with genuine shape diversity.
- [x] **Formula inspector is now a centered modal** (rebuilt per user feedback: "can't see
      the formulas on the little cards"). Tapping ƒ opens a portal-based modal
      that flips/scales in from center, dims the rest (so only one is open at a
      time), and shows every formula in full-width code blocks. Verified:
      Net Worth → primary/assets/liabilities/history all readable; Escape +
      backdrop + × all close it.
- [x] Sticky reorderable **pills** — scroll-spy, jump, drag; first pill = default
- [x] Order persisted per workspace (localStorage); agent-created dashboards appear
- [x] Card → transactions drilldown (card-scoped) inline
- [x] Provision curated persona dashboards (`PATCH /api/dashboards/:id`)
- [x] **Remove a card** from a dashboard (per-dashboard Edit mode → × on each card →
      `PATCH /api/dashboards/:id` cardIds). Live mode only.
- [x] **Pointer drag-reorder** of pills (unified mouse + **touch** via pointer
      events; tap still jumps, threshold separates tap from drag) — verified by
      driving real pointer events (reordered + restored)
- [x] **Keyboard reorder** of pills (Arrow Left/Right) alongside drag (a11y)
- [x] **Rename a dashboard** (edit mode → inline name input → `PATCH`)
- [x] **Delete a dashboard** (edit mode → Delete → confirm dialog → `DELETE
/api/dashboards/:id`, drops it from the saved order). Confirm dialog
      screenshot-verified (cancelled, not run on real data).
- [x] **Empty state** when zero dashboards installed → "Browse dashboards" CTA
      back into the install carousel
- [x] **Server-side dashboard order** — reorder persists via
      `PATCH /api/dashboards/reorder` and the saved order is adopted on load, so
      the default syncs across devices (verified: drag persisted to
      `GET /api/dashboards`, then restored)

## 4. Cards & Authoring — **agents author via chat/RPC; product reflects + inspects**

Per product vision (agentic-first), the product does NOT build a heavy manual card
builder. Agents create cards/dashboards via the `money.cards.*` RPC loop; the
product renders them and lets humans inspect.

- [x] Live mode shows ALL backend dashboards (agent-created appear), personas first
- [x] Inspect a card's backing data — card-scoped transaction drilldown drawer
- [x] Inspect a card's formula — flip-to-formula back
- [x] Monaco formula editor with backend completions (in `/ui-kit` design surface)
- [ ] (Optional) light "remove card from dashboard" affordance
- [ ] (Optional) deep-link "ask the agent to add a card here"

## 5. Transactions (`TransactionsScreen` — "Activity" tab)

- [x] Card-scoped paged drilldown sheet
- [x] Full transactions screen — search, direction filter, day-grouped, paging
- [x] **Tap a transaction → detail sheet** (inspect + label this one via `budget.need`)
- [x] **Date-range filters** (All time / This month / 30 days / This year)
- [x] **Category filter** — server-side `?category=`, options accumulate from
      loaded rows + humanized; screenshot-verified ("Rent And Utilities" → 1 row)
- [ ] Notes / mark recurring (likely agent-driven)

## 6. Categorize / human-in-the-loop (`ReviewScreen` — "Review" tab)

Reframed (after the user's "WARNING/OPPORTUNITY is cryptic, what do I do?" feedback)
from a flag list into **Categorize**: per-merchant, one clear decision
`budget.need` = **Required / Useful / Optional / Waste** (plain hints), which
labels all of that merchant's transactions and powers cards.

- [x] Built on the backend's `GET /api/transactions/review/groups` (merchant groups)
- [x] Meaningful choices (not "Reviewed") via `/api/labels/transactions`
      (`budget` namespace, `source:'user'`) — verified the apply contract w/ dryRun
- [x] "Labels all N · remembers for next time" + "Not spending / skip"
- [x] Backend shipped grouped review tasks (was `BACKEND.md` #3 — thank you)
- [x] **Teaching/forward rule** — backend shipped `teachRule:true` + `/api/labels/rules`
      (`BACKEND.md` ⭐P0); wired into the apply so a label sticks for future
      transactions. Taught-rule count surfaced in Settings. _Contract verified via
      dryRun; live teach not exercised to avoid mutating real data._
- [x] **Undo (delayed commit)** — a tap optimistically clears the card and shows
      an "Undo" toast; the real write + rule-teach only fire after a ~4.5s grace
      window (Gmail-style), so a mis-tap costs nothing. Verified live: tap → toast + count drops; Undo restores with **no write**; expiry auto-commits. Commits
      on tab-switch/unmount so nothing is silently dropped.
- [x] **Inspect before labeling** — tap a group to expand its actual transactions
- [x] **Persisted "Not spending / skip"** via the backend's `notSpendingAction`
      (`moneyFlow.role=ignored` + rule) — backend shipped P2; wired
- [x] **Transfers excluded** from the budget queue (backend ships `kind` + filters it)
- [~] Pre-suggested `need` per group — UI pre-highlights `suggested` when present
- [x] **Subscriptions management** — Review tab now has a Categorize/Subscriptions
      segment; Subscriptions lists recurring series (`GET /api/recurring/series`)
      with monthly load + Keep / Skip / Cancel via the backend's `reviewActions`
- [x] **Agentic first pass — fully working end-to-end** (backend fixed the AI
      500; model `openai/gpt-5.5`). "Auto-categorize" runs the bounded classifier
      (`saveProposals:true`, `apply:false`) → agent proposals with plain reasons +
      confidence. Because the backend's per-group `suggested` is sparse, the
      product **maps proposals → merchant groups client-side**
      (`useBudgetProposals` + `suggestedNeedForGroup`, majority need across a
      group's txns) so each card shows a **"✨ Suggested" pre-highlight** — confirm
      with one tap, not label-from-scratch. Verified live: classify ✅, suggestions
      render on the cards ✅, one-tap confirm dropped "54 → 53 left" + taught a
      forward rule ✅. Failures still degrade to a retry banner.
- [ ] Other axes beyond `budget.need` (joyReview keep/reduce/cancel, etc.) — later
- [ ] Dedicated proposal-approval queue (the Categorize cards already consume
      `suggested`; a separate accept/reject list is optional)
  > **2026-06-04 Categorize redesign** (per user feedback: "much cleaner, not super text
  > heavy"): replaced the verbose 4-chip-with-hints cards with a compact, scannable
  > layout — merchant + amount, a single shared **legend** for the four levels, a
  > tidy 4-way pill row (hints removed from each card), and a light "Inspect /
  > Not spending" footer. Agent suggestions pre-highlight the right pill with a
  > "✨ Suggested" tag so triage is one tap. Screenshot-verified; a11y audit 0
  > violations on the redesigned screen.

## 2b. Accounts summary

- [x] Net-worth / assets / debts summary header on the Accounts screen
- [x] **Balance trend** sparkline on the summary card with a **metric switcher**
      (Net worth / Assets / Debts / Investments — only metrics with history show a
      tab), delta-since, and a graceful "building history" state for sparse data
      (`GET /api/balance-snapshots`). Tabs + `aria-pressed` switching
      screenshot-verified; sparklines activate as snapshots accrue per sync.

## 7. App shell, settings, polish

- [x] Product routing (`/` product, `/admin` + `/plaid/*` console, `/ui-kit` design)
- [x] Host desktop nav stack (push/pop) for home → detail
- [x] Bottom **tab bar** shell: Dashboards · Review · Activity · Accounts · Settings
- [x] Settings: data status, sync schedule (auto-refresh + frequency), restart onboarding
- [x] App command palette entries (`useMoldableAppCommands` + handlers)
- [x] "Needs attention" nudge on the dashboards home → Review
- [x] Responsive / mobile pass (verified at 390px — tabs + grids reflow)
- [x] Fixed tall empty `% Income Saved` card (compact when no series)
- [~] Loading / empty / error states — present on most screens; not exhaustively audited
- [x] Accessibility — **DOM-audited every surface** (all 5 tabs + onboarding +
      celebration + connect dialog + transaction sheet + dashboard edit mode +
      Review): 0 missing accessible-name / label / alt / chart-role violations.
      `role="alert"` on errors, `aria-label` on icon buttons + the auto-refresh
      Switch, `aria-pressed` on filter/segment chips, `aria-current` on tabs,
      labeled charts, focus-trap + Escape on the custom overlay
- [ ] Post-connect celebration (basic success state only)

## 🔒 Requires explicit user authorization (built + wired, live trigger gated)

These are fully built and their non-mutating UI is verified, but firing them is
**deliberately gated** behind the user's standing instruction not to trigger Plaid
SMS / mutate real financial data. They are not "unbuilt" — they await a per-
action go-ahead:

- Connect a new institution (Plaid Link → real SMS to the account owner)
- Sync all (`POST /api/sync` — refreshes the real linked institution pull)
- Disconnect an institution (`DELETE /api/connections/:itemId` — destructive)
- Live label apply / agent classify pass (mutates local user data / spends AI)

## ⚠️ Testing caution

Do **not** trigger the Plaid connect flow when testing: `POST /api/plaid/connect-session`

- opening the connect URL launches a real Plaid Link session against the live bank
  and **texts the account owner a real verification code**. Verify the `ConnectDialog` UI only
  (screenshot the intro; don't click "Connect securely"). Likewise `POST /api/sync`
  and `DELETE /api/connections/:itemId` mutate the real account — verify wiring, not
  the live effect.

## Card presentation

- [x] **"Living off savings" drawdown reframe** — when income is negligible (not
      earning), savings-rate cards (% Income Saved, Savings Health) showed a
      nonsensical "-653%" / red-deficit donut. They now reframe to the monthly
      burn ("Living off savings · monthly burn"), pairing with Runway. Detected
      via `drawdownInfo` (deep-negative percent + derivable burn), rendered by a
      shared `DrawdownState` across Metric/Trend/Status cards. Verified live.
- [x] **Live-card secondaries fix** — `secondaryEntries` now normalizes the live
      API's `secondaryResults` ({key:{value}}) as well as demo `secondaryValues`,
      so live cards finally show their footer stats (e.g. Net Worth → Assets /
      Liabilities) and feed the drawdown burn.

## Known data/UX issues to revisit

- `% Income Saved` card reserves chart height even with "not enough history" → tall empty card.
- Some live values look wrong on sparse data (e.g. Credit Utilization 2398%, "OTHER OTHER_OTHER") — likely backend data/labels; confirm vs UI.

## What works now (the core production experience)

Onboard (install carousel → demo dashboards → DEMO badge + connect prompt) →
**Dashboards** (at-a-glance, with a "needs review" nudge) → inspect a card
(drilldown drawer + flip-to-formula) → **Review** (HITL inbox: recommendations +
proposals, with a count badge) → **Activity** (searchable transactions) →
**Accounts** (status, last-synced, balances, sync, disconnect, add) → **Settings**
(sync schedule, data status). Inline Plaid connect reaches the secure handoff.
Bottom tab bar + host command palette + responsive + dark/light. All client
toolchain green (types, lint, build, 80 tests).

## Honest remaining gaps (not production-complete yet)

1. **Live-verify** connect completion (real bank), Sync all, Disconnect — blocked:
   these trigger real Plaid SMS / mutate the real account (see Testing caution).
2. **Inspection depth**: tap a recommendation → see the exact transaction behind it
   (proposal-approval UI is data-blocked until an agent `classify` run exists).
3. ~~Activity filters~~ — done (search, direction, date-range, category).
4. ~~Money surfaces~~ — balance trend with Net worth / Assets / Debts /
   Investments **metric tabs** + recurring/subscriptions management ship.
   Remaining: per-individual-account trend (the four aggregate metrics ship).
5. ~~Dashboard management~~ — rename, reorder (touch + mouse + keyboard, now
   **server-persisted/cross-device**), remove-card, delete all ship.
6. ~~A11y~~ — DOM-audited every surface (tabs, onboarding, celebration, connect
   dialog, transaction sheet, dashboard edit mode, Review): **0 accessible-name /
   label / alt / chart-role violations**. Fixed the one finding (unlabeled
   auto-refresh Switch). Focus-trap + Escape, `aria-pressed`/`aria-current`,
   labeled charts and icon buttons all in place.
7. ~~Post-connect celebration~~ — done (confetti + "your real numbers are in").
