# Money — Frontend → Backend Handoff (product/UX needs)

This is the **frontend/product** side's running handoff to the backend engineer:
what the product UX needs from the backend to be great. `CLAUDE.md` is the
backend→frontend direction; this file is the reverse. Add items as they come up.

Author context: the product is **agentic-first** — users mostly drive things via
chat/RPC; dashboards are the at-a-glance core; humans **inspect** (card drilldown +
flip-to-formula) and occasionally do **human-in-the-loop** review. We want to
automate as much as possible and make the human step rare, grouped, and teaching.

## Backend sanity check notes

- The liquidity request below is sound: account-level `liquidityTier` /
  `liquidity` / `liquidityClass` is the right primitive for liquid-vs-illiquid,
  runway, FIRE, and available-now formulas.
- Implementation should not be formula-only. The same derivation must also run in
  account normalization so `GET /api/accounts` and formula cards agree.
- Formula normalization should derive `isAsset` / `isLiability` with the same
  fallback as account storage before evaluating `Where(isAsset = true)` cards.
- Layer-B extension registry support is a good future correction path for Plaid
  rows, but it is not required for v1 as long as read-time derivation and manual
  row overrides ship first.
- When `liquidity` and a stale `liquidityTier` disagree, the explicit liquidity
  label is authoritative; tier-only overrides still work when no label is set.

---

## ✅ DONE: seed the interim "Assets by type" card (+ warehouse projection fix)

> **Update (2026-06-07):** moot for the card itself — backend implemented the
> `liquidity` primitive below and seeded **`liquid-vs-illiquid`** instead, so the
> frontend dropped `assets-by-type` from the personas. **Update 2
> (2026-06-07):** backend now merges newly added default card definitions into
> existing workspace card files at read time and refreshes the cards warehouse
> projection after successful `POST /api/cards` / `PATCH /api/cards/:id`, so a
> new card appears in `GET /api/cards` without a manual warehouse rebuild.
> Account/sync/materialized-metric refreshes also refresh the card projection, so
> dashboards update when account facts change while heavier aggregates/indexes
> can still recompute separately.

Context: the "credit card balances" and "liquid vs illiquid" cards were initially
hard-coded product components that summed `/api/accounts` client-side (anti-pattern
— no formula on the back, not inspectable, not FX-normalized). They've been
**removed** in favor of formula cards: CC balances now use the existing seeded
`credit-utilization` card, and I added an **`assets-by-type`** breakdown
(`Accounts.Where(isAsset = true).GroupBy(subtype).PercentOfTotal()`) to the
Overview/FIRE personas as an **interim** stand-in for liquid-vs-illiquid.

Two asks:

1. **Seed `assets-by-type`** in `DEFAULT_CARD_DEFINITIONS` so it exists for every
   workspace (today I had to `POST /api/cards` it + `POST /api/warehouse/rebuild`
   to materialize it — new users won't have it until it's seeded). Title "Assets by
   Type", kind `breakdown`, formula above. (This is the interim card; once the
   `liquidity` classification below lands, I swap it for "Liquid vs Illiquid" — so
   if you implement liquidity in the same pass, seed that card instead and skip
   this one.)
   - Aside: `POST /api/cards` returns the materialized card, but `GET /api/cards`
     keeps serving the **stale warehouse projection** until a `warehouse/rebuild`
     — the create path probably should mark the cards artifact dirty so the new
     card shows up without a manual rebuild.
2. **A durable `liquidity` classification** so "liquid vs illiquid" can be a real,
   inspectable formula card — and so the recurring liquidity theme (runway,
   "available now", liquidity-waterfall) has one primitive to build on. Full
   grounded design with derivation rules, formula surface, override path, and
   acceptance criteria is in the dedicated section below
   (**"a durable `liquidity` account classification"**).

## ✅ DONE: FX-normalized values on `GET /api/accounts`

> **Implemented by backend (2026-06-07).** `/api/accounts` now preserves native
> `currentBalance` / `valueForSum` for row detail and also exposes
> `reportingValue`, `reportingCurrency`, `reportingValueStatus`,
> `reportingFxRate`, `reportingFxAsOf`, and `reportingFxSource` when workspace
> currency settings plus stored FX rates can convert the account balance. This
> matches formula rollups while letting the frontend aggregate accounts without
> mixing native currencies.

The new product cards (credit-card balances, **assets by liquidity**) and the
Accounts net-worth header roll up `/api/accounts` rows client-side. But that
payload returns **raw native-currency** `valueForSum`/`currentBalance` (for example, a CAD account row), with **no** reporting/FX field. So a
client-side sum mixes CAD+USD 1:1 — e.g. a raw mixed-currency sum vs the authoritative FX-normalized `Accounts.Sum()` card. The formula layer already computes
the right thing (`formulas.ts` emits `valueForSum: reportingValue` during
`Accounts.Sum()`), so the data exists — it's just not on the REST row.

**Ask:** expose the reporting-normalized fields the formula layer already has on
each `GET /api/accounts` row: `reportingValue`, `reportingCurrency`,
`reportingValueStatus` (mirroring what `Expenses.Sum()` etc. attach). The client
already prefers them when present (`normalizedValue()`/`dominantCurrency()` in
`data/assets.ts`), so once they ship, the liquidity/CC/net-worth rollups become
exact single-currency sums with no client FX. Per-account rows already render in
each account's native currency, so only the **aggregates** need this.

## ✅ DONE: a durable `liquidity` account classification (Liquid vs Illiquid)

> **Implemented by backend & verified live (2026-06-07).** Shipped almost exactly
> as specced: `normalizeAccountLiquidity` in `investments.ts` (override-first →
> liability `na` → tier-3 retirement/real-estate → tier-1 near-cash incl. HSA →
> tier-2 marketable/crypto → tier-0 cash → conservative illiquid fallback);
> `liquidityTier`/`liquidity`/`liquidityClass` on `MoneyAccount`, derived in
> `normalizeFormulaData`; `LiquidAssets`/`IlliquidAssets` registered in all three
> collection sites; field accessors + `humanizeEnumLabel` + schema enums wired;
> `rrsp`/`tfsa` added to `FORMULA_BUILT_IN_ENUMS`; and the **`liquid-vs-illiquid`**
> card seeded in `DEFAULT_CARD_DEFINITIONS`. Frontend swapped the interim
> `assets-by-type` → `liquid-vs-illiquid` on Overview + FIRE. **Verified:**
> `GroupBy(liquidityClass)` previews as a table with liquid and illiquid buckets, and the card renders live with ƒ-inspect. Open follow-ups: Layer B
> (the `account:liquidity` extension override namespace for reclassifying Plaid
> rows) is not yet needed; and existing workspaces still need a `POST /api/cards`
>
> - `warehouse/rebuild` to pick up the seeded card (the create-path-dirty aside
>   below). Original spec kept for reference.

> **Supersedes** the `liquidity` bullet (#2) of the _"seed the interim Assets by type card"_ request above, which proposed a flat `liquid | illiquid` field as the bare minimum to unblock one card. After tracing how `investmentAccountKind`/`taxTreatment` are derived and how `TaxSheltered` resolves, I'm refining it into a **durable, ordered** classification, because this theme keeps recurring (emergency-fund runway, "available now", liquidity-waterfall, downturn stress). The interim `assets-by-type` card stays as-is until this lands; then I swap it for the seeded "Liquid vs Illiquid" card defined here.

### Why not hard-code it (again)

The original "liquid vs illiquid" card summed `/api/accounts` client-side — no formula on the back, not inspectable, not FX-normalized. We already killed that anti-pattern. And per CLAUDE.md ("don't add broad regex heuristics to the formula engine; classification should produce auditable extension values that formulas then consume"), the answer is **not** a formula-time `GroupBy` over name strings. It's a **deterministic derived account field**, computed exactly the way `investmentAccountKind`/`taxTreatment` already are — in `normalizeFormulaData`'s `accounts.map` (`formulas.ts`, the block that today calls `normalizeInvestmentAccountKind` → `normalizeTaxTreatment` after `applyFormulaAccountReporting`). That site runs for **plaid + manual + seed + legacy** rows on every evaluation, after FX, so nothing needs re-importing or backfilling.

### Proposed taxonomy

An **ordered** dimension `liquidityTier` (0..3) plus a string label `liquidity` and a 2-bucket projection `liquidityClass` that the card uses. Mirrors the house enum style of `taxTreatment`/`investmentAccountKind`/`assetClass` (lowercase snake_case, closed set, escape hatch).

| `liquidityTier` | `liquidity`  | `liquidityClass` | meaning                                                                               |
| --------------- | ------------ | ---------------- | ------------------------------------------------------------------------------------- |
| `0`             | `cash`       | `liquid`         | spendable today at par, no penalty/market risk                                        |
| `1`             | `near_cash`  | `liquid`         | convertible in days at ~par (CDs, treasuries, HSA cash)                               |
| `2`             | `marketable` | `liquid`         | sellable T+1..T+3 with market risk, no withdrawal penalty (taxable brokerage, crypto) |
| `3`             | `illiquid`   | `illiquid`       | retirement/registered + hard assets (real estate, vehicle)                            |
| —               | `na`         | `na`             | not an asset-liquidity concept (liabilities)                                          |

`liquidityClass = tier===undefined ? 'na' : tier<=2 ? 'liquid' : 'illiquid'`. This **exactly** satisfies the user's fixed mapping: cash (t0) + taxable brokerage (t2) = **liquid**; retirement + real estate (t3) = **illiquid**. The 4-tier label is upside for later (runway, waterfall) at no cost to the card.

### Default per-account-kind derivation (first match wins)

New `normalizeAccountLiquidity(account)` in `investments.ts`, next to `normalizeInvestmentAccountKind`/`normalizeTaxTreatment`, same `Pick<MoneyAccount, ...>` signature + token-normalizer style. **No new regex** beyond the bounded subtype/kind token sets the existing helpers already use; it consumes the **already-normalized** `type`/`subtype`/`investmentAccountKind`/`taxTreatment`, not raw provider strings.

1. **Override first** — `normalizeLiquidityToken(account.extensions?.liquidity?.class ?? account.liquidity)` (mirrors `normalizeInvestmentAccountKindToken`). If present, honor it and return. _(Override layers below.)_
2. **Liability → `na`** — reuse the **exact** `isLiabilityAccount` fallback (`account.isLiability ?? (currentBalance < 0 || type in {credit,loan,mortgage})`). Do **not** branch on raw `isLiability` — seed/manual rows leave it undefined. `availableCredit` is borrowing headroom, **never** liquid cash.
3. **Tier 3 illiquid** — `investmentAccountKind in {401k,ira,roth_ira,rrsp,tfsa,529}` OR `taxTreatment in {tax_deferred,tax_free,education}`; OR `subtype` token in `{real_estate,'real estate',property,home,vehicle,car,auto}`.
4. **Tier 1 near_cash** — `subtype` token in `{cd,'certificate of deposit',treasury,t-bill,tbill}` OR `investmentAccountKind==='hsa'` (HSA cash is withdrawable at par for qualified expenses without penalty, so it's near_cash, not locked retirement).
5. **Tier 2 marketable** — `type==='investment'` with `investmentAccountKind==='brokerage'` or `taxTreatment==='taxable'`; OR crypto signal (reuse `CRYPTO_MARKERS`).
6. **Tier 0 cash** — `type==='cash'` OR `subtype` token in `{checking,savings,money_market,'money market','cash management',prepaid,cash}`.
7. **Asset fallback → tier 3** — an asset with no liquidity signal is presumed not-spendable-now (conservative; never inflates the liquid bucket / runway). Overridable.

> **rrsp/tfsa already classify.** I verified `MoneyInvestmentAccountKind` and the zod `accountSchema` enum both already include `rrsp`/`tfsa`, and `normalizeInvestmentAccountKind`/`normalizeTaxTreatment` already emit and route them (rrsp→`tax_deferred`, tfsa→`tax_free`). So step 3 catches Canadian kinds today. **The only gap is `FORMULA_BUILT_IN_ENUMS['account.investmentAccountKind']`, which is stale — it lists `['brokerage','401k','ira','roth_ira','hsa','529','other']`, missing `rrsp`/`tfsa`.** Please add them in this change (autocomplete only; no effect on derivation) now that Plaid defaults to `["US","CA"]`. The CLAUDE.md doc-string for `investmentAccountKind` is also missing rrsp/tfsa — fix it in the same pass.

### Manual-account handling

Manual rows bypass all provider derivation — `buildManualAccount` passes `subtype`/`isAsset`/`isLiability` verbatim and `subtype` is free-form (`z.string().optional()`), so a manual home-value row arrives as `{type:'other', subtype:'real_estate', isAsset:true}` and a manual mortgage row as `{type:'mortgage'}`. Because derivation lives at **read-time** in `normalizeFormulaData` (which runs for manual rows), both classify with zero extra input:

- **Home value** (`subtype:'real_estate'`) → step 3 → tier 3 → `illiquid`. Lands in `IlliquidAssets` and the illiquid `GroupBy` bucket.
- **Mortgage** (`type:'mortgage'`, `isLiability` often undefined) → step 2 via the `isLiabilityAccount` fallback → `na`. Excluded from both asset collections and the `Where(isAsset = true)` card, so it never leaks into illiquid assets.
- **Self-declaration:** add `liquidity` (and optionally `liquidityTier`) to `accountSchema` (`money-routes.ts`); they flow through `manualAccountCreateSchema`/`manualAccountPatchSchema` (which `.omit`/`.partial` off `accountSchema`) and need a one-line pass-through in `buildManualAccount`. A user who disagrees with the default (e.g. a locked vested lot they consider illiquid) sets it at create/patch and step 1 honors it.

### Formula surface (what I'll build against)

- **New fields on `MoneyAccount`** (add union types near `MoneyInvestmentAccountKind`): `liquidityTier?: 0|1|2|3`, `liquidity?: MoneyAccountLiquidity` (`'cash'|'near_cash'|'marketable'|'illiquid'|'na'`), `liquidityClass?: 'liquid'|'illiquid'|'na'`.
- **Filterable/groupable** on any account collection: `Accounts.Where(liquidityClass = "liquid").Sum()`, `Accounts.Where(liquidityTier <= 1).Sum()` ("available within days"), `Accounts.GroupBy(liquidity)`.
- **Target card formula (the deliverable):** `Accounts.Where(isAsset = true).GroupBy(liquidityClass).PercentOfTotal()` → returns a **table** → card **`kind: breakdown`** (kind is validated against materialized output type at save). This replaces the interim `assets-by-type` formula.
- **Derived collections** `LiquidAssets` / `IlliquidAssets` (account entity, `defaultMeasure: 'balance'`) so `LiquidAssets.Sum()`, `IlliquidAssets.Sum()`, and the liquid-ratio `LiquidAssets.Sum() / Assets.Sum()` all evaluate. Today `TaxSheltered.Sum()` resolves but `LiquidAssets.Sum()` throws "Unknown collection" because it's in **none** of the three registration sites — that's exactly what this adds.

### Override / correction path

Two layers, derived-first, **user/agent wins** — same precedence as `merchantGroup`/`taxContribution`:

- **Layer A (v1, ship this):** the row-column override on the manual write path above. `normalizeAccountLiquidity` checks `normalizeLiquidityToken` first, so a stored `liquidity`/`liquidityTier` always beats the derived default. No registry, no merge — enough to ship the card and fix the user's home/mortgage.
- **Layer B (optional, deferrable — for correcting _plaid-imported_ rows without mutating the provider row):** register an `account` extension namespace `liquidity` (`PUT /api/extensions/registry`, entity `account`, field `{name:'class', type:'enum', enumValues:['cash','near_cash','marketable','illiquid','na']}`, `coverage:'exhaustive'` over asset accounts — `validateExtensionValues` rejects unregistered `entity:namespace`). Override via `POST /api/extensions/values {entity:'account', entityId, namespace:'liquidity', source:'user'|'agent', values:{class}}`. `overlayEntityExtensions(data.accounts,'account',extensions)` already runs **before** `applyFormulaAccountReporting`, so the override is on `account.extensions.liquidity` when step 1 reads it. If a derived default is ever _materialized_ to disk, write it `source:'rule'` and reuse the `mergeDerivedTransactionExtensions` discipline — but the read-time default means **nothing needs persisting**, which is cleaner. **Recommendation: ship Layer A now; add Layer B only when an agent needs to reclassify a plaid row.**

### FX / reporting behavior

No FX work requested — reporting-currency normalization of account aggregates already shipped (`reportingValue`/`reportingCurrency`/`reportingValueStatus`/`reportingFxRate`/`reportingFxAsOf`/`reportingFxSource`). Liquidity classifies the **account, not the amount**, so it's currency-independent and must run whether or not FX conversion happened. The insertion point guarantees correctness: derivation runs **after** `applyFormulaAccountReporting`, reading `type`/`subtype`/`kind`/`treatment` (never balances). `LiquidAssets.Sum()` / `GroupBy(liquidityClass).PercentOfTotal()` measure via `baseRowMeasure` (`valueForSum ?? currentBalance`), so they sum **reporting** values automatically — single-currency rollups exactly like `Accounts.Sum()`. (Inherited caveat, not new: if `reportingCurrency` is set but an FX rate is missing for a row, that row stays native and the sum can mix currencies — agent remedy is `money.fxRates.replace`.)

### REST + RPC touchpoints

- **Types** (`money-types.ts`): `MoneyAccountLiquidity`, `MoneyLiquidityClass` unions; optional `liquidityTier`/`liquidity`/`liquidityClass` on `MoneyAccount`.
- **Helper** (`investments.ts`): `normalizeAccountLiquidity` + `normalizeLiquidityToken`.
- **Formula wiring** (`formulas.ts`): call helper in `normalizeFormulaData` accounts.map; add `fieldValue` accessors for `liquidity`/`liquidityClass` (string) and `liquidityTier` (numeric coercion) beside the `taxTreatment` branch; add `'liquidity'`/`'liquidityClass'` to the `humanizeEnumLabel` field list; add `isLiquidAccount`/`isIlliquidAssetAccount` predicates next to `isTaxShelteredInvestmentAccount`; register `LiquidAssets`/`IlliquidAssets` in **all three** sites (`DEFAULT_COLLECTION_DEFINITIONS`, `buildCollections` metrics, `buildRuntimeCollections`) using the shared predicate — missing `buildRuntimeCollections` throws "Unknown collection", missing `buildCollections` trips the static diagnostic.
- **Schema advertisement** (`money-routes.ts`): add `{name:'liquidity',type:'string'}`, `{name:'liquidityClass',type:'string'}`, `{name:'liquidityTier',type:'number'}` to `FORMULA_ENTITY_SCHEMAS.account`; add `'account.liquidity'`/`'account.liquidityClass'` to `FORMULA_BUILT_IN_ENUMS`; **fix `'account.investmentAccountKind'` to add `rrsp`/`tfsa`**; add `liquidity`(/`liquidityTier`) override fields to `accountSchema`.
- **Seeded card** (`DEFAULT_CARD_DEFINITIONS`): add **Liquid vs Illiquid**, `kind:'breakdown'`, `formula: 'Accounts.Where(isAsset = true).GroupBy(liquidityClass).PercentOfTotal()'`. **Seed it — do not rely on runtime `POST /api/cards`**, which serves the stale warehouse projection until a `warehouse/rebuild` (the create-path-doesn't-mark-dirty aside from the interim ask still applies). New workspaces should get it without a manual rebuild.
- **No new REST route or RPC for the field itself.** Layer A rides `PATCH /api/accounts/:id` (manual) + `GET /api/accounts` (rows now carry the three fields) and the existing `money.accounts.*` / `money.formulas.*` (preview/schema/complete) surfaces. Layer B, if shipped, rides the existing `POST /api/extensions/values` + `money.extensions.values.*` and `PUT /api/extensions/registry` — no new verbs.

### Edge cases

- **Credit card with headroom** → `na`; `availableCredit` is never counted as liquid.
- **Seed/manual missing `isAsset`/`isLiability`** → handled by the `isLiabilityAccount` fallback, not raw fields.
- **Taxable vs retirement brokerage** → distinguished by already-derived `investmentAccountKind`/`taxTreatment`, no name re-regex.
- **Crypto** → tier 2 marketable (T+0 sellable but volatile), liquid in the 2-bucket view, separable later for risk.
- **HSA** → tier 1 near_cash (liquid); overridable for users who treat it as long-term invested.
- **Bad enum in a filter** (`Where(liquidity = "typo")`) → silently filters to empty (static diagnostics validate field **names** only, not enum values — same as `taxTreatment` today). Autocomplete + the Layer-B registry constrain writes.
- **Holdings** → out of scope for v1; account-level liquidity does **not** auto-appear on the `Investments` (holding) entity. If wanted later, derive separately in the holdings.map block where `investmentAccountKind`/`taxTreatment` are already inherited.

### Acceptance criteria

1. `account.liquidity`, `account.liquidityClass`, `account.liquidityTier` appear in `GET /api/formulas/schema` (account entity) and autocomplete via `POST /api/formulas/complete`.
2. `Accounts.Where(isAsset = true).GroupBy(liquidityClass).PercentOfTotal()` evaluates to a `table` and `diagnoseFormula(..., buildCollections(data))` returns `[]`.
3. `LiquidAssets.Sum()` and `IlliquidAssets.Sum()` evaluate (no "Unknown collection"); the `buildCollections` metric and `buildRuntimeCollections` row set agree for the same dataset (no TaxSheltered-style drift).
4. Fixtures: cash account → `liquid`/tier 0; taxable brokerage → `liquid`/tier 2; 401k/ira/rrsp/tfsa/529 → `illiquid`/tier 3; manual `subtype:'real_estate'` → `illiquid`/tier 3; manual `type:'mortgage'` with undefined `isLiability` → `na`; credit card → `na`.
5. A Layer-A override (manual `liquidity:'illiquid'` on a taxable lot) wins over the derived default and survives FX normalization.
6. `LiquidAssets.Sum()` over a mixed-currency dataset with FX rates present returns a single reporting-currency total (parity with `Accounts.Sum()`).
7. The seeded **Liquid vs Illiquid** card materializes for a fresh workspace with no manual `POST /api/cards` + `warehouse/rebuild`.
8. `FORMULA_BUILT_IN_ENUMS['account.investmentAccountKind']` includes `rrsp`/`tfsa`.
9. `pnpm exec vitest run src/server/formulas.test.ts` and `pnpm exec tsc --noEmit` pass.

---

## 🆕 Production-readiness asks (from the local-first "ready for others" audit)

We audited the app for "another person installs it in their own Moldable and uses
it." The **frontend slice is done** (a Plaid-keys setup card in `ConnectDialog`
gated on a `POST /api/plaid/readiness` pre-probe; `vault[]` declared in
`moldable.json`; data-health/accounts error+retry states; a per-card error
boundary; carousel keyboard nav; a human `README.md`; `/data` gitignored). These
are the **backend / host / upstream** items left:

1. **DONE (2026-06-07) — Atomic writes + corruption-tolerant reads**
   (`@moldable-ai/storage` + app-local). Upstream `@moldable-ai/storage`
   `writeJson` now writes a same-directory temp file, fsyncs it, then atomically
   renames it into place. Money also wraps storage reads in `money-storage.ts` so
   corrupt JSON shards are renamed to `*.corrupt-*` with a short metadata note and
   the caller receives its default instead of a permanent 500. This needs an
   upstream storage package release for other Moldable apps to inherit atomic
   writes.

2. **DONE (2026-06-07) — Guard `/admin` + `POST /api/dev/seed` for shipped builds.**
   `POST /api/dev/seed` now returns `dev_seed_disabled` in production unless
   `MONEY_ENABLE_DEV_SEED=true`. `/admin` now routes to the product in production
   unless `VITE_MONEY_ENABLE_ADMIN=true`. `/ui-kit` remains available as the
   explicit design/reference surface.

3. **DONE (2026-06-07) — connect-session surfaces credentials-missing code.**
   `POST /api/plaid/connect-session` now uses `plaidReadinessError()`, so missing
   Plaid credentials return `plaid_credentials_missing` plus `setupCommands`
   instead of only `plaid_connect_session_failed`.

4. **P2 (upstream, low) — shipped grammar-chunk bloat.** `dist/` ships ~9 MB of
   lazy `shiki` TextMate-grammar chunks pulled in by `@moldable-ai/ui`'s
   `code-block`. Code-split (no initial-load cost) but bloats the package. For the
   host UI lib to trim / lazy-load grammars on demand — nothing to do in Money.

Heads-up: the frontend now declares `vault[]` in `moldable.json`
(`PLAID_CLIENT_ID` / `PLAID_SECRET` + their backing `plaid/*` capabilities) so the
host can prompt for keys in **Settings → Vault**, matching the Meetings/Scribo
pattern. If the host needs anything else in that declaration to drive the prompt,
let me know.

---

## 🆕 Rework Money's "Today" contribution (`/api/moldable/today`) — stop the junk

> **Implemented by backend (2026-06-08).** `/api/moldable/today` no longer emits
> flat `Large expense detected` / posted-transaction items. It keeps the
> `blocked` reauth/sync-error items, pulls active recurring-obligation series due
> in the next 7 days into compact due-soon Today items, aggregates all opt-in
> category threshold breaches into one item, and formats amounts with
> reporting/native currency instead of hardcoding USD. With nothing due, nothing
> broken, and no opt-in budget breach, Money contributes no Today items.
>
> **Frontend/PM polish applied directly in `src/server/attention.ts`** (small,
> presentation-level — flagging since it's your file): (1) **skip already-overdue
> obligations** — a recurring `nextDueDate` in the past is far more likely
> stale-after-payment than a genuinely missed bill, and the user's _paid_ mortgage was
> surfacing as "MORTGAGE SERVICER due overdue" (false alarm + awkward "due
> overdue" string); (2) a `displayName()` helper that **title-cases shouty
> ALL-CAPS provider names** ("MORTGAGE SERVICER" → "Mortgage Servicer") while
> leaving short acronyms (AMEX/a linked U.S. institution) and already-cased names alone; (3) **de-dupe
> the subtitle** so it doesn't echo the name already in the title. Added test
> `index.test.ts` "skips already-overdue obligations and softens shouty names in
> Today"; `tsc`/`lint`/all 4 Today tests green. Possible follow-ups (not done): a
> confident "unpaid" signal could resurrect genuinely-overdue items, and CC
> statement due dates could join the recurring-obligation source.

the user saw the host **"Worth a look"** rail showing two `Large expense detected`
items (two large posted CAD transactions) and (rightly)
called them junk. They are: backward-looking (the charge already posted — nothing
to do), **constant** (there's always a biggest recent transaction, so this never
goes quiet), and currency-wrong (`buildMoneyAttentionItems` formats every amount
as USD via `formatCurrency`, so a CAD charge shows a misleading `$`).

**The bar for Today.** It's the host's cross-app glance — it competes with
calendar and mail. An item earns a slot only if it's (1) **time-sensitive** (acting
today vs. ignoring it changes the outcome — a due date, a stale connection), (2)
**actionable** (a clear next step), and (3) worth interrupting for. And the meta
rule: **silence by default** — most days a money app should contribute _nothing_.
"You made a big purchase" fails all of this.

**What's already right in `app.ts` (keep it):** the two `kind: 'blocked'` items —
`Reconnect {institution}` (needs_reauth) and `Money sync failed`. Textbook Today
items. No change.

**The ask — in `src/server/attention.ts` (`buildMoneyAttentionItems`):**

1. **Delete the flat large-transaction block** (the `Large {direction} detected`
   items). It's the junk. A posted transaction is not a Today item.
2. **Add the one money item genuinely worth a daily glance: bills due soon.**
   Recurring obligations / credit-card statements with a due date in the next
   ~5–7 days → e.g. `title: "Rent due Thursday"`, `subtitle: "amount · Example merchant"`. A deadline + an implicit action (make sure funds are there). This is
   the thing a money app uniquely knows. Pull from the recurring-obligation series
   (`nextDueDate` within the window) and/or CC statement due dates; dedup; cap at
   2–3; rank soonest-first. The builder currently only receives `transactions` +
   `settings` — it'll need the recurring-obligation/subscription due-date data
   (and ideally CC statement due dates) plumbed in, the way `/api/moldable/today`
   already loads connections/syncState.
3. **Keep category-over-budget but only because it's opt-in** (fires only when the
   user set a `categoryThreshold`). Roll multiple breaches into one line rather
   than one item per category.
4. **Fix the currency bug** regardless: format each amount in its own currency
   (`reportingValue`/`reportingCurrency` when present, else the row's native
   `isoCurrencyCode`) — never hardcode USD.
5. **Default to empty.** With nothing due and nothing broken, return `[]`. That's
   correct, not a gap.

Optional later (higher bar): a _genuinely unusual_ charge — a likely duplicate, a
charge far above that merchant's own norm, or a brand-new recurring subscription
that just started ("New subscription: Acme monthly amount"). That's "unusual for you,"
not "large" — and only with high confidence. Not needed for the fix.

Net: most days Money shows nothing in Today; when it speaks up it's "a bill's due"
or "reconnect to keep syncing" — never "you spent money." (This is the frontend/PM
recommendation; the surface is server-owned so it's yours to implement. Happy to
refine the copy or thresholds.)

---

## 🚩 P0 — The Review / human-in-the-loop experience is not usable yet

**What the user saw:** the Review tab rendered **143 individual rule-warnings**
("Review large expense: Cross-Border Transfer Merchant", repeated many times for the same merchant,
different amounts). His feedback, verbatim in spirit:

- "Not sure what's being asked of me."
- "Why are there so many repeats?"
- "No way I want to tap through 143 of the same kind over and over."
- "Wasn't clear it was a _label_ I was reviewing. If I disagree, then what — it just
  goes unlabeled? How do I teach the system what these should be going forward?"

**Root cause (my read of the current contracts):**

- `/api/transactions/label-plan` shows labeling is meant to be **agent-driven**:
  classify → proposals → human approves. Today there are **0 proposals**
  (`has_proposals: 0`) because no `classify` has run, so the UI has nothing to
  approve.
- So the Review tab fell back to `/api/recommendations`, which returns **143
  ungrouped rule warnings** (`has_recommendations: 143`). Those are _insights_, not
  a teachable labeling task, and they repeat per-transaction.

**What I'll do on the frontend now (so it's not blocked):**

- Group recommendations by merchant/pattern client-side (kill the repetition);
  bulk "mark reviewed".
- Reframe Review into clear sections: **Approve** (proposals), **Categorize**
  (label-plan status), **Flags** (grouped recommendations). Make each section say
  what it is and what the action does.

**What I need from the backend for this to be genuinely good:**

### 1. A teaching / learning loop (the big one)

When a human sets or corrects a label for a merchant/pattern, it must:
(a) apply to **all matching** transactions now (bulk — `labelApply` seems to do
this), AND
(b) **persist a forward rule** so _future_ synced transactions from that
merchant/pattern auto-apply the same label/category — and the agent stops
re-proposing it.
Today labels look like per-transaction extensions; user/agent/provider values win
per-transaction, but I don't see a **user-taught forward rule**. Without (b), the
human can never "teach" the system — they'd re-label forever.

- **Request:** a rule primitive, e.g. `POST /api/labels/rules`
  `{ match: { merchantId | merchantName | category | textPattern }, namespace,
values, scope: 'merchant'|'pattern' }` that (i) labels existing matches and
  (ii) auto-applies on future imports, and is editable/removable. Surface existing
  rules so the UI can show "you taught us N rules".

### 2. Correct-in-one-step (not reject → unlabeled)

Rejecting an agent proposal currently just leaves it unlabeled. The human needs to
say "no, it's actually **X**" in one action = reject wrong + set right + teach rule.

- **Request:** either extend proposal decide to accept a corrected value
  (`decide { id, decision: 'correct', values, teachRule: true }`), or document that
  the flow is reject-then-`labelApply`-with-rule and give me both in one round-trip.

### 3. Grouped / aggregated review tasks (merchant-level), not per-transaction

The valuable unit is "**Label all N 'Cross-Border Transfer Merchant' transactions** → Transfer", not
N rows. `label-plan` is namespace-aggregate; the review queue is per-transaction
with `labelSelector`. I want **merchant-grouped review tasks within a namespace**:
each group = merchant, count, total, current label + source/confidence, suggested
label, and a bulk selector.

- **Request:** a grouped review surface, e.g.
  `GET /api/transactions/review/groups?namespace=&reason=` →
  `[{ merchantId, name, count, total, currentLabel, suggested, confidence,
selector }]`. (If you'd rather I group client-side from the per-tx queue, tell me
  the stable group key + that one `labelApply` selector covers the whole group.)

### 4. De-noise recommendations

143 "large expense" rule-warnings is not an actionable list. Options (your call):
group by merchant, collapse to "your N largest expenses this month — review",
add a confidence/severity threshold, and/or a **bulk-resolve** by class.

- **Request:** grouped or summarized recommendations, and/or
  `PATCH /api/recommendations` bulk status by `{ kind, sourceEntity, ids[] }`.

### 5. Category / label vocabulary for the picker

When a human corrects a label, the UI must offer the valid choices (budget
categories, moneyFlow types, etc.). I believe `/api/extensions/registry` carries
field enums — please confirm it exposes, per namespace, the **human-facing label +
allowed values** I can render as a chooser (and that those are the same values
`labelApply`/rules accept).

### 6. Who triggers classify?

The label-plan says `recommendedRpc: money.transactions.classify`. Should the
**product** trigger classification (e.g., a "Let agents categorize" button calling
`/api/classify/transactions`), or is that purely an agent/cron job and the product
should just reflect resulting proposals? If the product may trigger it, confirm
cost/rate expectations and a safe default selector.

Backend answer: the product **may trigger classification** from an explicit user
action such as "Let agents categorize". Use the `classifyRequest` returned by
`GET /api/transactions/label-plan` / RPC `money.transactions.labelPlan` as the
safe payload: it is already namespace-scoped, direction-scoped where relevant,
bounded by `limitPerJob`, and defaults to `saveProposals: true` + `apply: false`.
Safe product default: `limitPerJob`/`maxTransactions` <= 50, model
`openai/gpt-5.5`, proposal-first, then show proposal/review groups for accept,
correct, or teach. Agents may use `apply: true` only for explicit autonomous
workflows with a high `minConfidenceToApply` threshold, and should dry-run or
save proposals first for visible UI flows.

When data-health returns `review-label-proposal-groups`, use
`params` for the top pending namespace, `namespaceParams[]` when rendering or
processing each namespace explicitly, and `allParams` for a complete proposal
group sweep. All variants call `money.transactions.reviewGroups` with
`reason: "has_proposals"`. When no namespace is supplied, review groups are
partitioned by namespace plus merchant so each group still has a namespace,
suggestion, and executable `suggestedLabelAction`.
Agents that want to clear many high-confidence proposal groups should call
`money.transactions.reviewGroups.applySuggestions` with the same params. It
defaults to `dryRun: true`, supports `maxGroups` and `minConfidence`, executes
each group's `suggestedLabelAction` through `labelApply`, and returns compact
selected/skipped/failed summaries. The default response includes top-level
`summary` plus per-group `resultSummary` and proposed `values`, but omits full
matched transaction details; pass `includeResultDetails: true` only for drill-in.
Apply with `dryRun: false` only after the preview confirms the selected groups,
write counts, and zero unexpected failures.

All budget merchant-group chips now use the same durable path: group
`labelActions[].previewRequest` / `applyRequest` call
`money.transactions.labelApply` with `source: "user"` and `teachRule: true`.
That means choosing Required/Useful/Optional/Waste from the group writes current
matches, teaches a forward merchant rule, clears/supersedes matching proposals,
and refreshes dependent cards.

Card readiness sparse-label actions are even narrower when the backend can rank
useful candidates. `classify-sparse-extension-candidates` now sets
`params.selector.transactionIds` for the top provider-fact candidates and keeps
the broader missing-namespace request in `fallbackParams`. Agents/frontends
should run `params` first; use `fallbackParams` only when the ranked pass returns
no useful proposals.

---

## Implemented lower-priority frontend asks

- `DELETE /api/dashboards/:id` removes a dashboard; RPC
  `money.dashboards.delete` mirrors it. `PATCH /api/dashboards/:id` remains the
  create/update path.
- `GET /api/transactions/:id` returns one visible transaction for drilldown;
  RPC `money.transactions.get` mirrors it.
- `GET /api/first-run` returns `{ accountsConnected, accountCount,
connectionCount, dataMode }`; RPC `money.data.firstRun` mirrors it.
- `GET /api/connections` returns safe Plaid Item summaries for choosing an
  institution; RPC `money.connections.list` mirrors it for agents. Both omit
  credential refs and access tokens.
- `POST /api/connections/:itemId/sync` syncs one Plaid Item without refreshing
  unrelated institutions; RPC `money.connections.sync` mirrors it for agent
  validation loops and per-connection Sync now UI.
- `DELETE /api/connections/:itemId` revokes one Plaid Item through aivault and
  removes its item-scoped local facts; RPC `money.connections.delete` mirrors it
  for agent/UI disconnect flows. Both paths clear the sync cursor and refresh
  dependent card metrics without returning credential refs or tokens.

## What already works well (thank you)

`/api/cards/:id/transactions` (card-scoped drilldown), `label-plan`, the review
queue with `labelSelector`/`labelActions`, `labelApply`/`labelPreview`, the
extension registry, and the cards RPC loop. The current Review gaps above are now
covered by backend grouping, teaching rules, correction, de-noising, registry
vocabulary, and proposal-first classification guidance.

---

## Backend status updates

- 2026-06-04: Implemented request 3. Use
  `GET /api/transactions/review/groups` or RPC
  `money.transactions.reviewGroups` for merchant-grouped review tasks. Groups
  include count, total, current/suggested labels, pending proposals, active
  recommendations, transaction samples, and a bulk `labelSelector` compatible
  with `labelApply`. Groups with a `suggested` label also include
  `suggestedLabelAction`, a ready-to-run `money.transactions.labelApply`
  preview/apply payload. Budget suggested actions use `teachRule: true`, so one
  confirmation labels current merchant matches and teaches the forward rule.
  Groups also include `impact` with observed amount, months observed,
  monthly average, annualized amount, suggested values, and a rollup formula
  hint so agents/UIs can prioritize the labels that materially affect cards.
  Review groups now apply registry-backed eligible directions by default
  (`budget` is expense-only), and homogeneous group selectors/rules carry
  `direction` so merchant-level budget actions do not accidentally label income
  or refund rows from the same merchant. Review groups also support
  `transactionSampleLimit`, `includeTransactions`, and `includeTransactionIds`;
  use `includeTransactions=false&includeTransactionIds=false&transactionSampleLimit=0`
  for compact triage lists and request samples only on drill-in.
- 2026-06-04: Added RPC
  `money.transactions.reviewGroups.applySuggestions` for agent batch workflows
  over grouped proposal suggestions. It accepts the same review-group filters,
  defaults to `dryRun: true`, can cap work with `maxGroups` and
  `minConfidence`, and runs each selected group's `suggestedLabelAction`
  through the normal `labelApply` path so taught rules, materialized cards, and
  proposal resolution stay consistent.
- 2026-06-04: Implemented request 1 teaching/rules loop. Use
  `POST /api/labels/rules`, `GET /api/labels/rules`, and
  `DELETE /api/labels/rules/:id`, or RPC
  `money.transactions.labelRules.list/create/delete`. Existing
  `money.transactions.labelApply` also accepts `teachRule: true` plus optional
  `rule: { name, scope, match }`. Rules validate against the extension registry,
  apply to existing matching transactions, and auto-apply during future
  `writeMoneyData`/Plaid import writes.
- 2026-06-04: `money.transactions.labelApply` now clears stale pending proposals
  for the same selected transaction namespace. Exact proposal/value matches are
  accepted; conflicting proposals are rejected as superseded by the applied
  human/agent label. Responses include `resolvedProposals`, `proposalCounts`, and
  updated `reviewAfter` counts, so the Categorize tab can use the normal
  `labelApply` path without leaving old proposal warnings behind.
- 2026-06-04: `money.transactions.labelPreview` and
  `money.transactions.labelApply` now include `summary` with `matchedTotal`,
  `selectedTotal`, `wouldWriteTotal`, `wroteTotal`, `hasMore`, `namespace`, and
  `dryRun`. Frontends/agents should assert against this compact summary before
  relying on row samples or writing labels.
- 2026-06-04: Implemented request 2 correct-in-one-step. Use
  `POST /api/extensions/proposals/decide` or RPC
  `money.extensions.proposals.decide` with `action: "correct"`, selected `ids`
  or filters, corrected `values`, optional `correctedNamespace`, and optional
  `teachRule: true`. The backend rejects the wrong proposal for audit, writes
  the corrected extension value, can teach a forward merchant/pattern rule, and
  returns `reviewAfter`.
- 2026-06-04: Implemented request 4 recommendation de-noising. Use
  `GET /api/recommendations/groups` or RPC `money.recommendations.groups` to
  group warnings/opportunities by merchant, source, or kind. Groups include
  counts, total estimated impact, compact id/link counts, and executable bulk
  actions by default. Opt into recommendation ids, source links, and samples only
  for drill-in. Use `PATCH /api/recommendations` or RPC
  `money.recommendations.patch` to bulk update status by group selector, ids, or
  bounded filters.
- 2026-06-04: Fixed stale materialized card cache behavior for forecast cards.
  `GET /api/cards` remains the authoritative live card response; materialized
  card rows are cache-only and are filtered out when their stored formula no
  longer matches the current definition. Card save/refresh now materializes the
  fully evaluated card display value, so the financial independence card caps
  zero/negative-savings or unknown-age projections at `99+` instead of showing
  stale legacy values such as `8`.
- 2026-06-04: Resolved request 6. Product-triggered classification is allowed
  from explicit user action. Use `label-plan`'s `classifyRequest` as the safe
  default payload, keep `saveProposals: true` and `apply: false` for UI flows,
  and let review/proposal groups handle accept/correct/teach. Classification
  responses now include `summary` with matched/selected/proposed/saved/applied/
  skipped counts so UIs and agents can verify whether a run only saved proposals
  or actually wrote formula-visible labels.
- 2026-06-04: `label-plan` pending-proposal jobs now recommend
  `money.transactions.reviewGroups` instead of raw proposal listing, and include
  compact `reviewGroupsRequest` plus dry-run `applySuggestionsRequest` for
  merchant-level preview/apply flows.

---

## Frontend update — the "Categorize" UX I shipped on `review/groups` (thank you!)

`review/groups` is exactly what I needed — it's now the **Categorize** tab. I made
an opinionated product call you should design against:

**The one human decision is `budget.need` = required / useful / optional / waste.**
Each merchant group shows that as four labeled choices (with plain hints); a tap
calls `POST /api/labels/transactions { selector: group.labelSelector,
namespace:'budget', values:{need}, source:'user' }` and resolves the group. This
is the primitive that slices spending into cards
(`Expenses.Where(need = "required")`), so it's the core loop, not an afterthought.

Given that, these are now my **sharpened, ranked** needs:

### ⭐ P0 — request 1 (teaching/forward rule) is the make-or-break

When I apply `budget.need` to a merchant today it labels the existing matches, but
the user's mental model is **"I taught it — new cross-border transfer rows should auto-be
optional."** Without a forward rule that's a lie. Please make
`labelApply { source:'user', teach:true }` (or the `POST /api/labels/rules`
primitive) persist a merchant/pattern→need rule that auto-applies on future
imports and suppresses re-flagging. This is the single most important thing for
this surface to feel honest.

Backend status: implemented on 2026-06-04 via `teachRule: true` on
`labelApply` and direct `/api/labels/rules` / labelRules RPCs.

### P1 — `review/groups` should pre-suggest a `need` per group

So I can pre-highlight the agent/provider's best guess (e.g.
`RENT_AND_UTILITIES → required`, dining → optional) and the user mostly confirms.
Add `suggested: { namespace:'budget', values:{ need }, confidence }` per group.
(My UI already renders a `suggested` highlight if present.)

Backend status: implemented on 2026-06-04. Proposals win first; otherwise
budget groups get a category/provider-code-derived `suggested.values.need`
without merchant-name regexes.

### P1 — keep pure transfers OUT of the Categorize queue

a cross-border transfer merchant can show up as many high-dollar "expenses" — that's clearly money
movement, not consumption. Budget-labeling it is nonsense. Please classify
transfers/`moneyFlow` server-side and **exclude them from `review/groups`** (or tag
the group `kind:'transfer'` so I can route it to a one-tap "Mark as transfer"
instead of the need chips). Otherwise the human wastes taps skipping non-spending.

Backend status: implemented for explicit transfers, linked-account payments
that clearly reference a connected credit/loan/mortgage/investment account, and
`moneyFlow` transfer roles (`source`, `destination`, `bridge`, `transfer`,
`ignored`). Budget `review/groups` excludes those rows and all groups now include
`kind`.
Budget review groups also have a product-safe default: omitted
`/api/transactions/review/groups` params now normalize to
`reason=missing_namespace&namespace=budget&direction=expense`, so the Review
screen's default Categorize feed no longer mixes in recommendation flags.

### P2 — a durable "skip / not spending" signal

My "Not spending / skip" currently just hides the group for the session. I'd like
to persist it (e.g. `labelApply moneyFlow` or a `dismissReview` flag) so it doesn't
reappear. Tie this to the transfer classification above.

Backend status: implemented on 2026-06-04. Budget `review/groups` now includes
`notSpendingAction`, an executable `money.transactions.labelApply` payload that
labels the merchant group as `moneyFlow.role = "ignored"` with `teachRule: true`.
Once applied, current and future matching expense rows are excluded from budget
Categorize.

Backend status: updated on 2026-06-04. `review/groups` defaults to
`sort=impact`, so Categorize/agent triage starts with the merchant groups whose
annualized dollar impact will change dashboards the most. `sort=priority` keeps
the proposal/recommendation/count-first ordering when needed; `sort=count` and
`sort=recency` are also available.

### Earlier review requests are resolved

Request 2 correct-in-one-step is implemented through proposal
`action:"correct"`. Request 4 recommendation de-noise is implemented through
recommendation groups and bulk patch. Request 5 label vocabulary is resolved
through `/api/extensions/registry`. Request 6 product-triggered classify is
resolved above: product actions may use `label-plan`'s bounded
`classifyRequest`, proposal-first.

### Live-data transfer reconciliation

Backend status: implemented on 2026-06-04. `GET /api/data-health` now includes
`cashFlow.moneyFlowReview` for large expense rows missing `moneyFlow` labels and
returns `review-money-flow-candidates` as a next action with executable
`money.transactions.reviewGroups` params. This catches real cross-border transfer transfer
principal without hardcoding merchant regexes into formulas.

`GET /api/data-health` also includes `cashFlow.moneyFlowResolution` for labeled
money-flow chains that are still incomplete or unbalanced. It returns
`resolve-money-flows` with `money.moneyFlows.list { status: "needs-review" }`,
which is the expected state for a local cross-border transfer rail until the Canadian destination
account or other flow legs are linked/labeled. The action's `params` stay compact
for dense scans; `drilldownParams` enables candidate searches/matches when an
agent or UI is ready to repair a flow. Each unresolved flow from
`money.moneyFlows.list` now includes structured `nextActions` with bounded
`money.transactions.search` params and a `labelTemplate` for destination/source/
fee legs. Missing source/destination actions also include per-leg
`candidateSearches`, so agents can resolve multi-row cross-border transfer rails one transfer at
a time without guessing from raw files. Candidate searches include
`previewRequest` and `applyRequest` payloads for `money.transactions.labelPreview`
and `money.transactions.labelApply`; use preview first, inspect matches, then
apply only when the receiving/source/fee leg is clear.
Cross-currency destination actions now also include ranked `candidateMatches`
when linked non-source-currency transfer rows are visible. Each match is an
exact transaction candidate with a score, structural reasons, locked target
amount/currency values, and one-row `previewRequest` / `applyRequest` payloads.
Agents should prefer these exact candidates over broad search selectors when
they are present.
Updated on 2026-06-04: cross-currency destination actions also include
`candidateMatchGroups`, keyed by the closest source/transfer leg. Each group
keeps the source date/amount/currency plus exact candidate rows with preview and
apply payloads. Agents and UIs should use groups for multi-leg rails so they can
resolve one source leg at a time instead of treating a flat candidate list as one
bulk operation.
For dense agent or UI scans, call
`money.moneyFlows.list { status: "needs-review", includeTransactions: false, includeTransactionIds: false, includeCandidateSearches: false, candidateSearchLimit: 0 }`
or the equivalent `/api/money-flows` query. The response keeps totals,
warnings, `transactionCount`, `labelSelectorSummary`, and compact `nextActions`,
but omits row samples, raw transaction id lists, executable
`labelSelector.transactionIds`, and candidate-search templates until the caller
drills into a specific `flowId` or sets `includeTransactionIds=true`.

Updated on 2026-06-04: missing-destination flows also include a
`find-cross-currency-destination-leg` action when the workspace has linked
accounts or visible transactions in non-source currencies. The action searches
nearby `direction=transfer` rows in the target currency (for example CAD for a
USD-to-CAD cross-border transfer rail) without applying the source-currency amount filter, so FX
conversion does not hide the matching deposit.

Updated on 2026-06-04: `moneyFlow.destinationKind` now supports
`"unlinked_owned"` for real holding-tank moves where the receiving account is
owned by the user but not linked yet, such as USD -> transfer provider -> Canadian bank. A
source/transfer-only flow with `destinationKind: "unlinked_owned"` returns
`status: "external"` and `needsReview: false`, so transfer principal stays out
of expenses without forcing a fake destination transaction. Missing-destination
flows include an executable `money.moneyFlows.markExternalDestination` next
action named `mark-unlinked-owned-destination` for this case; the RPC supports
dry-run and returns the lower-level extension patch request it will apply. The
listed next action defaults to `dryRun: true` so agents can validate before
writing the unlinked-owned destination state.

### Plaid country coverage

Backend status: updated on 2026-06-04. New Plaid Link token/connect-session
requests default to `country_codes: ["US", "CA"]`, so Add bank account can show
Canadian institutions such as a Canadian institution without disconnecting existing US
Items. Callers may still pass explicit `countryCodes` to narrow a particular
Link session.

Formula/card consumers should treat `Runway(cash, monthlySpend)` as a typed
`duration` response. Current card APIs return values such as
`{ type: "duration", amount: 0.92, unit: "month", days: 27.8 }` plus a compact
`displayValue` like `28 days`; arithmetic formulas may still use Runway as a
numeric month value.

Evaluated card responses now include inferred primary `outputType` plus
`secondaryResults` for every `secondaryFormulas` entry:
`{ formula, value, displayValue, outputType, referencedCollections }`. Use that
for typed card display/context rows instead of re-previewing formulas one by one.
Spreadsheet-style ratios and FIRE context formulas are typed as percent/number,
not money, when the top-level expression is a ratio. Card drilldowns also accept
`formulaKey`, e.g. `/api/cards/income-saved/transactions?formulaKey=currentMonthCashFlow`,
to explain a named secondary formula with transaction rows when the formula is
row-explainable. `money.cards.test` also returns `secondaryDrilldowns` keyed by
secondary formula name for passing cards, so agents can validate generated card
context rows before save.

`% Income Saved` and `Savings Health` now use
`SavingsRate(Income.Sum(), Expenses.Sum())` over the visible dataset as their
headline formula. Rolling six-month and current-month savings rate/cash flow
are secondary formulas, so a partial month with expenses before payroll does
not render the headline as `0%`.

I also applied a user-confirmed local rule in the local workspace:
`merchantId = cross-border-transfer-merchant`, `direction = expense` →
`moneyFlow.role = "transfer"` with `teachRule: true`. That labeled existing cross-border transfer rows, refreshed metrics, removed cross-border transfer provider from largest expenses, and
cleared the money-flow review warning. Future matching cross-border transfer rows should
auto-apply the same transfer label.

### Recurring/subscription active quality

Backend status: implemented on 2026-06-04. `Subscriptions` and
`RecurringObligations` formulas now ignore materially stale `active` labels
using `nextDueDate` plus a cadence-aware grace window (short for weekly/monthly,
longer for quarterly/yearly). `GET /api/recurring/series` and RPC
`money.recurring.series` support `status=stale` so the UI/agents can review old
inferred series without those stale rows inflating active subscription counts or
monthly costs. On a local live import this reduced stale active subscriptions and their monthly total.
For dense agent/UI scans, call
`money.recurring.series { includeTransactionIds: false, includeReviewActions: false }`
or the equivalent query string. Compact responses keep series totals, cadence,
due dates, `transactionCount`, `labelSelectorSummary`, and
`reviewActionSummary`, but omit raw transaction id lists, executable
`labelSelector.transactionIds`, and activate/skip/dismiss payloads until
drill-in.

### Merchant grouping review quality

Backend status: implemented on 2026-06-04. `GET /api/merchants/review` and RPC
`money.merchants.review` now only mark real canonicalization candidates as
`needs-group`: multiple raw merchant ids/names that collapse to the same
structural candidate. Stable single-name merchants are treated as already
`grouped`, which keeps the human/agent queue from showing hundreds of no-op
approvals.

I applied three high-confidence local merchant groups in the local workspace:
`Example Work Merchant`, `Example Utility Merchant`, and
`Example Vendor Merchant`. The merchant review queue now has 0
`needs-group` items, and the example utility merchant collapsed from duplicate recurring
obligation series into one active obligation.

### Balance snapshot fallback for live imports

Backend status: updated on 2026-06-04. Historical
`balance-snapshots/YYYY-MM.json` shards remain authoritative, but
`GET /api/balance-snapshots`, RPC `money.balanceSnapshots.list`, and
snapshot-backed formulas always merge a current snapshot set from visible
accounts/holdings. Current facts replace same-id rows and same-day aggregate
snapshots (`netWorth`, `assets`, `liabilities`, `investment`), so stale aggregate
rows cannot make trend cards disagree with `Accounts.Sum()`. The current merge
only emits an `investment` aggregate when holdings or investment-like accounts
exist. Investment-like accounts use the same normalized account-kind detection
as formulas, so IRA/RRSP/brokerage-style balances can power a basic
`InvestmentHistory` trend even before Plaid investments product detail imports
security holdings.

### Sparse/exhaustive card readiness gaps

Backend status: implemented on 2026-06-04. `GET /api/cards/readiness` and RPC
`money.cards.readiness` now compute each `namespaceGaps[].missingNamespaceTotal`
against the namespace's eligible transaction set instead of every visible row.
Expense-only extensions such as `sharedExpense`, `subscription`, and `budget`
exclude income and transfer rows from missing-label counts. The extension
registry also exposes `coverage: "exhaustive" | "sparse"` for transaction
namespaces. Sparse namespaces such as `sharedExpense`, `taxContribution`,
`subscription`, `moneyFlow`, and `merchantGroup` do not create missing-label
debt merely because a transaction lacks that annotation. Entity-card readiness
also uses backing facts when formula collections have fallback rows. APR-driven
debt cards now add `metadataGaps` when open debts/liability accounts exist but
no positive APR metadata is available, so high-APR/payoff/interest cards stay
`empty` instead of presenting fallback liability rows as actionable APR output.
Data-health no longer asks agents to classify fake shared/tax labels or treat
empty debt optimizer cards as actionable.

### Optional Plaid product hints

Backend status: implemented on 2026-06-04. `GET /api/data-health` now reports
`providerProducts.accountHints` for linked debt-like and investment-like
accounts whose Items were stored without the relevant Plaid optional product.
For a local live import this correctly explains why mortgage/retirement
account balances are visible but normalized `debts`/`holdings` are still empty:
the Items have `products: ["transactions"]`, not `liabilities` or
`investments`.

### Linked-account transfers, runway, and manual balances

Backend status: implemented on 2026-06-05. Formula evaluation now reclassifies
expense-looking payments to linked credit/loan/mortgage/investment accounts as
`Transfers` before building `Income`, `Expenses`, and `CashFlow`. This catches
provider mislabels such as bill payments to a linked card showing up as utility
or cable spend, while leaving unrelated bill payments as ordinary expenses.

Default overview cards now carry explicit `timeWindow` metadata. Savings health
and income-saved use rolling six-month savings rate; monthly cash flow uses the
current month; expense breakdown and largest expenses use rolling six months
with current-month/all-time secondary formulas. Runway now uses rolling net burn:
`Runway(Cash.Sum(), Expenses.MonthlyAverage(6) - Income.MonthlyAverage(6))`.

Manual account CRUD is available for off-Plaid assets/liabilities such as home
value, private debts, vehicles, or other balance adjustments:

- `POST /api/accounts` creates a `source: "manual"` account.
- `PATCH /api/accounts/:id` updates only manual accounts.
- `DELETE /api/accounts/:id` deletes only manual accounts.

Linked Plaid accounts remain read-only through this surface. Manual account
writes refresh account/balance materialized formulas and current balance
snapshots, so `Accounts.Sum()`, `Assets.Sum()`, `Liabilities.Sum()`, and net
worth cards include the new balances immediately.

`/api/cards`, `/api/data-health`, and `/api/money/snapshot` use a short
workspace-scoped in-memory read cache. The first evaluation on a large import is
still expensive, but repeated React refetches/app reloads within the cache
window return immediately; mutation paths that refresh materialized metrics
invalidate the workspace cache.

`providerProducts.accountHints.{liabilities,investments}` now includes
`itemAccountCounts`, and the consolidated `update-plaid-item-consent` next
action includes an `items[]` explanation beside the executable
`params.sessions[]`. Use `params.sessions` for `money.plaid.connectSessions`;
use `items[]` to show why each Item needs `liabilities`, `investments`, or both
without reverse-engineering aggregate coverage.

Data-health emits `linked_liability_accounts_missing_liabilities_product` and
`linked_investment_accounts_missing_investments_product`, plus one consolidated
`update-plaid-item-consent` action with `rpc: money.plaid.connectSessions`.
Params include `sessions: [{ itemId, additionalConsentedProducts }]`, `itemIds`,
and the union `additionalConsentedProducts`. Each session still maps to one
Plaid update-mode Link flow; the batching is for agent/UI planning, not a single
Plaid multi-Item Link screen.
`/api/sync/status` and `/api/connections` also add per-Item
`productCoverage.{liabilities,investments}.suggestedByAccounts` and
`nextActions[]` for drill-in. When one Item needs both products, the row returns
one `relink-with-optional-products` action with
`params.additionalConsentedProducts: ["liabilities", "investments"]`; when it
needs only one, it returns `relink-with-optional-product`. `nextAction` remains
the first action for simple clients. These are Plaid consent/update tasks, not
formula repair or fake holdings/debt derivation.
The RPCs return external-browser `url` values and never return Link tokens; after
Link succeeds, `/api/plaid/complete-update`
records the newly authorized product and returns `money.connections.sync` as
the next action.
Disconnect flows should call `DELETE /api/connections/:itemId` or RPC
`money.connections.delete`; both ask aivault to run `plaid/item-remove` before
clearing accounts, transactions, debts, holdings, balance snapshots, sync cursor,
and materialized metrics for that Item.
When the user or an agent already knows APR/payment metadata, use
`PATCH /api/debts/:id` or RPC `money.debts.patch` instead of editing files. The
id may be an existing debt id or a linked account id; APR values over `1` are
accepted as percentages and normalized to rates.

### Card readiness next actions

Backend status: implemented on 2026-06-04. `GET /api/cards/readiness` and RPC
`money.cards.readiness` now include a compact `nextActions` array per card.
Frontends and agents should use these actions before editing formulas. Current
actions include:

- `relink-plaid-liabilities` via `money.plaid.connectSession` when debt/APR
  cards are empty because linked debt-like accounts lack the liabilities
  product consent. Params include `itemId` and
  `additionalConsentedProducts: ["liabilities"]`.
- `patch-debt-metadata`/manual debt repair via `money.debts.patch` when APR,
  minimum payment, due date, or balance is known without Plaid liabilities
  product detail.
- `relink-plaid-investments` via `money.plaid.connectSession` when investment
  history cards are empty because linked investment-like accounts lack the
  investments product consent. Params include `itemId` and
  `additionalConsentedProducts: ["investments"]`.
- `review-recurring-series` via `money.recurring.series` for empty subscription
  or recurring-obligation cards.
- `review-merchant-groups` via `money.merchants.review` for empty merchant-group
  cards.
- `classify-sparse-extension-candidates` via `money.transactions.classify` for
  sparse extension-backed cards such as shared expenses and tax contributions.
  These actions are bounded, proposal-first, and use `apply: false`. When
  possible, `params.selector.transactionIds` contains ranked candidates selected
  from transaction facts such as direction, amount, recurrence, Plaid/provider
  category fields, payment channel, and existing extensions. `candidateCount`
  and `candidateReasons` summarize the pass; `fallbackParams` contains the
  broader namespace selector.

On a local live import this turns empty cards into actionable repair paths, including optional-product consent and sparse-label classification tasks.

### Reporting-currency formula rollups

Backend status: implemented on 2026-06-04. Formula runtime rows now expose
`reportingCurrency`, `reportingValue`, `reportingValueStatus`,
`reportingFxRate`, `reportingFxAsOf`, and `reportingFxSource` for ordinary
transactions, accounts, debts, holdings, and balance snapshots when workspace
currency settings plus stored FX rates can convert them. `moneyFlow` locked
reporting values still win for settled cross-currency transfer flows. Missing
FX rates do not create fake reporting metadata; agents/frontends can use
`money.fxRates.replace` or `PUT /api/fx-rates` to provide deterministic rates.

---

## Frontend update — Dashboards redesign (2026-06-04)

The Dashboards tab is now **one scrollable view of all dashboards** with a sticky
**pill rail** (scroll-spy + click-to-jump + **drag-to-reorder**; first pill = the
user's default). Reorder now persists **server-side** via
`PATCH /api/dashboards/reorder { ids }` (thanks — wired + verified), with
localStorage as an optimistic buffer and the server order adopted on load so the
default syncs across devices. Drag is unified pointer events (touch + mouse).

- Done: server-side dashboard order is implemented. `MoneyDashboard.order` is
  persisted, `GET /api/dashboards` returns display order, and
  `PATCH /api/dashboards/reorder { ids: [...] }` / RPC
  `money.dashboards.reorder` moves listed dashboards to the front while
  preserving omitted dashboards' relative order.
- Done: **`DELETE /api/dashboards/:id`** / RPC `money.dashboards.delete` removes
  a dashboard.

## Classification backend status (2026-06-04)

Resolved the live `POST /api/classify/transactions` failure. Root cause was the
old default model id (`gpt-5.4-mini`), which the Moldable AI server reported as
unknown. The backend default and manifest default now use `openai/gpt-5.5`, while
still accepting explicit caller overrides.

The classify request now also sends a registry-derived strict JSON schema:
proposal values enumerate the requested namespace fields and forbid additional
properties, instead of using dynamic `additionalProperties`. If the AI server
still rejects a request, `src/server/moldable.ts` now surfaces the upstream
error body and writes a bounded workspace diagnostic to
`llm-generate-json-failures.jsonl`.

Live smoke over `https://money.localhost:1355` with
`missingNamespace=budget`, `direction=expense`, `limit=3`,
`saveProposals=false`, and `model=openai/gpt-5.5` returned `ok: true`,
selected a bounded transaction batch and produced proposals.

## Warehouse projection backend status (2026-06-05)

The hot dashboard paths now use persisted warehouse projections:

- `GET /api/cards` and RPC `money.cards.list` read
  `data/projections/cards/current.json` when current.
- `GET /api/data-health` and RPC `money.data.health` read
  `data/projections/data-health/current.json` when current.
- Dashboard reads serve the last good projection even when the warehouse is
  dirty. Responses include `warehouse: { stale, recomputing, source,
generatedAt, sourceMtimeMs, buildMs }` so the frontend can show "updating" or
  "stale" state without blocking useful data.
- `data/aggregates/monthly/current.json` stores monthly rollups for income,
  expenses, transfers, cash flow, category, merchant, account, currency, and
  direction.
- `data/indexes/transactions/current.json` plus per-key files store compact
  transaction indexes by account, merchant, category, and transfer reason.
- `money.formulas.preview` uses the monthly aggregate fast path for exact
  supported formulas: transaction collection `Sum`, `MonthlyAverage`,
  `Monthly().Trend()`, and
  `Expenses.GroupBy(category).PercentOfTotal()`. Unsupported/richer formulas
  still use the runtime evaluator.
- `GET /api/warehouse/status` / RPC `money.warehouse.status` report whether
  projections, aggregates, and indexes exist; whether they are stale; dirty
  partitions; current recompute job state; current import job state; and last
  build times. The response includes `busy`, `importing`, `recomputing`,
  `importJob`, and `job`, so the frontend can show background activity without
  forcing all projected cards into loading states.
- `POST /api/import/raw?async=true` starts a background import job and returns
  `202` with `{ started, running, job, warehouse }`. The job phases are
  `queued`, `writing-facts`, `refreshing-derived`, `rebuilding-warehouse`,
  `complete`, and `error`. Use `GET /api/import/status` or RPC
  `money.import.status` to poll. This path is intended for first-time imports,
  CSV reimports, and other larger ingestion flows where the UI should show a
  general "working" indicator while continuing to render last-good projections.
- `POST /api/warehouse/rebuild` / RPC `money.warehouse.rebuild` rebuild the
  cards/data-health projections, monthly aggregates, and transaction indexes.
- `POST /api/warehouse/rebuild?scope=dirty` / RPC
  `money.warehouse.rebuild { scope: "dirty" }` performs a dirty rebuild when
  the dirty set is transaction-month scoped. It recomputes only the affected
  monthly aggregate partitions and updates transaction index files by removing
  dirty-month entries and merging the current rows for those months. Cards and
  data-health projections are still refreshed. If the dirty set is broad or the
  required artifacts are missing, the backend falls back to a full rebuild and
  reports both `requestedScope` and actual `scope`.
- `POST /api/warehouse/rebuild?async=true` / RPC
  `money.warehouse.rebuild { async: true }` starts a per-workspace rebuild and
  returns immediately with `started`, `running`, `job`, and `status`. Poll
  warehouse status for completion. Duplicate starts while the in-process lock is
  active return the current running state instead of launching another rebuild.
- Async dirty rebuilds are supported with
  `POST /api/warehouse/rebuild?async=true&scope=dirty` or RPC
  `money.warehouse.rebuild { async: true, scope: "dirty" }`. Job metadata
  includes `scope`, `requestedScope`, `dirtyBefore`, and `dirtyMonths` so the UI
  can show that stale last-good data is being recomputed.
- Transaction search now uses warehouse indexes for exact `accountId` and exact
  `category` queries, with optional direction/date/amount filters applied before
  paging. Responses include `warehouse: { source: "index", indexed: true,
index, key, generatedAt, stale }` when indexed and `source: "fact-scan"` when
  the query falls back.

Live measurement on a local imported workspace after context reuse and warehouse artifacts: projected `/api/cards` reads in about 7-8ms, projected
`/api/data-health` reads in about 5ms, warehouse status reads in about 10ms, and
full cards + data-health + monthly aggregates + transaction indexes rebuild in
about 1.2s. Exact account-indexed transaction pages read around 6-10ms on the
current live import shape. Frontend and agents should use the projected
card/data-health endpoints for dashboards, poll warehouse status for
recomputing/stale expectations, and batch categorization edits before requesting
a rebuild. After human/agent categorization batches, prefer `scope=dirty`; use
full rebuilds for sync/imports, FX changes, schema changes, or broad repairs.
For user-visible ingestion, prefer async import so the blocking work happens in
one background sequence: write facts, refresh materialized formulas/cards, then
full-rebuild warehouse artifacts once.
