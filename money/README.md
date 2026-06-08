# 💵 Money

A **local-first personal finance app** for [Moldable](https://moldable.ai). Connect
your banks, cards, and brokerages through Plaid; Money normalizes the data into
accounts, transactions, balances, and holdings, then renders **formula-backed,
inspectable cards** on dashboards you can curate. Everything runs on your own
machine and your financial data never leaves it.

- **Agentic-first** — most things can be driven via chat/RPC; dashboards are the
  at-a-glance core; you inspect numbers (card drilldown + flip-to-formula) and do
  occasional human-in-the-loop review.
- **Local-first** — data lives in your own Moldable workspace on disk. There's no
  shared server and no hosted account; you bring your own Plaid credentials.

## Requirements

- A running **Moldable** host (Money is a Moldable app, not a standalone server —
  Moldable owns its lifecycle, URL, theming, and secret vault).
- **Your own Plaid Production keys** (a `client_id` and `secret`). Money does not
  ship with credentials; each install uses its own. A free Plaid developer
  account works for getting started.

## Setup: connect your Plaid keys

You only do this once.

1. Create/sign in to a Plaid account and open your keys at
   **https://dashboard.plaid.com/developers/keys**.
2. In Moldable, open **Settings → Vault** and add two secrets:
   - `PLAID_CLIENT_ID` — your Plaid Client ID
   - `PLAID_SECRET` — your Plaid Production secret
     (Money declares these in `moldable.json` under `vault`, so the host knows to
     prompt for them.)
3. Open Money → **Connect an account** and link your first institution. Your
   dashboards switch from sample data to your real numbers.

If you open **Connect an account** before adding the keys, Money shows a setup
card pointing you here — it won't dead-end.

> Prefer the command line? You can also store the keys with the `aivault` CLI:
> `aivault secrets create --name PLAID_CLIENT_ID --value "…"` and the same for
> `PLAID_SECRET`. The in-app dialog shows the exact commands.

## First run

With no accounts connected, Money runs in **demo mode**: pick from a few starter
dashboards (Overview, FIRE, Cash Flow, Debt), explore them on synthetic sample
data, and connect a real account whenever you're ready. Connecting clears the
demo badges and fills the cards with your data.

## Surfaces

- **`/`** — the product: onboarding → dashboards → accounts/transactions/review/
  settings.
- **`/ui-kit`** — the design surface: component gallery, formula playground, and a
  card **Author** for building new formula cards.
- **`/admin`** — a developer/debug console (Plaid status, raw metrics, formula
  test). Not part of the everyday product.

## Development

Moldable owns the dev server lifecycle — don't start it by hand. Useful checks:

```bash
pnpm check-types   # tsc --noEmit
pnpm lint          # eslint --max-warnings 0
pnpm build         # production build
pnpm test          # unit tests (server formulas, etc.)
```

The frontend lives in `src/client/**`, the backend in `src/server/**`. See
`CLAUDE.md` and `BACKEND.md` for the backend↔frontend contract notes, and
`product.prd.md` / `ui-kit.prd.md` for the feature inventory.

## Privacy

Your transactions, balances, and Plaid item tokens stay local — tokens are held
by Moldable's aivault, never returned to the app or the client bundle. The only
data that leaves your machine is what _you_ trigger: Plaid API calls to sync your
accounts, and (optionally) transaction text sent to the Moldable AI proxy when
you ask it to categorize spending.
