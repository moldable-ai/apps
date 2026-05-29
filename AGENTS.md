# Moldable Apps Development Guidelines

## Overview

This repository contains official apps for [Moldable](https://github.com/moldable-ai/moldable) - a personal software factory where users create, shape, and discard hyper-personalized applications.

**Website**: https://moldable.sh

## App Structure

Each app is a self-contained Vite + Hono + React application:

```
app-name/
├── moldable.json           # App manifest (required)
├── package.json            # Dependencies
├── index.html              # Full app HTML entry
├── vite.config.ts          # Vite config
├── eslint.config.js        # Shared Moldable app ESLint config
├── scripts/
│   └── moldable-dev.mjs    # Startup script (required)
├── src/
│   ├── client/
│   │   ├── main.tsx        # React entry with ThemeProvider + WorkspaceProvider
│   │   ├── app.tsx         # Main app view
│   │   └── globals.css     # Styles
│   ├── server/
│   │   ├── index.ts        # Server entry
│   │   └── app.ts          # Hono routes, including /api/moldable/health
│   ├── components/
│   └── lib/
└── tsconfig.json
```

## moldable.json Schema

```json
{
  "name": "App Name",
  "version": "1.0.0",
  "visibility": "public" | "private",
  "description": "What the app does",
  "author": "Moldable Team",
  "license": "FSL-1.1-ALv2",
  "repository": "moldable-ai/apps",
  "icon": "📦",
  "iconPath": "public/icon.png",
  "widgetSize": "small" | "medium" | "large",
  "category": "productivity" | "developer" | "finance" | "health" | "entertainment" | "social",
  "tags": ["tag1", "tag2"],
  "moldableDependencies": {
    "@moldable-ai/ui": "^0.1.0",
    "@moldable-ai/editor": "^0.1.0",
    "@moldable-ai/storage": "^0.1.0"
  },
  "env": [
    {
      "key": "API_KEY",
      "name": "API Key",
      "description": "Required for...",
      "url": "https://example.com/get-key",
      "required": true
    }
  ]
}
```

> **Note**: The `visibility` field controls whether an app is included in the public release. Apps with `"visibility": "public"` will be copied to the moldable-apps repository when running `pnpm release` or `pnpm app:copy:all`.

## Tech Stack

- **Framework**: Vite + Hono
- **React**: 19+
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Package Manager**: pnpm

## Shared Packages

Apps use shared packages from `@moldable-ai/*`:

| Package                | Purpose                      |
| ---------------------- | ---------------------------- |
| `@moldable-ai/ui`      | UI components, theme, shadcn |
| `@moldable-ai/editor`  | Lexical markdown editor      |
| `@moldable-ai/storage` | File storage utilities       |

## UI Guidelines

### Theme System (Required)

All apps MUST use the shared theme system:

```tsx
// src/client/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, WorkspaceProvider } from '@moldable-ai/ui'
import { App } from './app'
import './globals.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>
    </ThemeProvider>
  </StrictMode>,
)
```

```css
/* globals.css */
@import 'tailwindcss';
@import '@moldable-ai/ui/styles';
```

### Today contribution (recommended)

There is no widget view anymore. The Moldable home is the **Today** view, and apps
contribute to it through an HTTP route — `GET /api/moldable/today` — that returns
zero or more "items" plus an optional "resume" point. The golden rule is **stay
silent unless something genuinely needs the user right now**.

```ts
// src/server/app.ts
app.get('/api/moldable/today', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const items: unknown[] = [] // push only when it truly earns attention
  // resume = where the user left off (powers the "Pick up where you left off" rail)
  const resume = /* ... */ null
  return c.json({ items, resume, generatedAt: new Date().toISOString() })
})
```

Item kinds: `resume` | `active` (running now) | `blocked` (needs unblocking) |
`timely` (imminent) | `threshold` (a limit crossed) | `milestone` | `agent-activity`.
Each item: `{ id, kind, surface?, title, subtitle?, icon?, priority?, actions? }`,
where an action is `open-app` | `rpc` (call your own /api/moldable/rpc) | `message`
(prompt the chat) | `navigate`. See `prds/today-view.prd.md`. Do NOT mirror old
widget behavior (no always-on lists, no bare counts, no empty-state nags).

### Color Usage

Always use semantic colors (not raw Tailwind colors):

```tsx
// ✅ Correct
<div className="bg-background text-foreground border-border" />
<button className="bg-primary text-primary-foreground" />

// ❌ Wrong
<div className="bg-white text-gray-900" />
```

### Icons

Use Lucide icons:

```tsx
import { Loader2, Plus, Settings } from 'lucide-react'
```

### Buttons

All `<button>` elements must include `cursor-pointer` class (unless disabled).

## Health Check Endpoint

Every app needs a health check endpoint at `/api/moldable/health`:

```ts
// src/server/app.ts
import { Hono } from 'hono'

export const app = new Hono()
app.get('/api/moldable/health', (c) => c.json({ status: 'ok' }))
```

## Development

Apps are NOT run directly - Moldable desktop manages app lifecycle. When developing:

1. Make code changes
2. Test through Moldable desktop's webview
3. Never run `pnpm dev` manually

## Creating a New App

1. Copy structure from an existing app (e.g., `todo`)
2. Update `moldable.json` with your app's metadata
3. Implement your app
4. Run `npm run generate-manifest` to update the registry
5. Submit a PR

## Releasing Apps

The release process copies public apps from `~/.moldable/shared/apps`, runs quality checks, and commits:

```bash
pnpm release           # Full release (copy, format, lint, types, manifest, commit)
pnpm release --dry-run # Preview what would happen
pnpm release --skip-copy # Skip copying from ~/.moldable/shared/apps
```

The release script:

1. Copies all apps with `"visibility": "public"` from `~/.moldable/shared/apps`
2. Runs prettier (format)
3. Runs eslint (lint)
4. Checks TypeScript types
5. Generates `manifest.json`
6. Commits all changes (does NOT push - you push manually)

### Copying Individual Apps

```bash
pnpm app:copy scribo      # Copy single app
pnpm app:copy todo notes  # Copy multiple apps
pnpm app:copy:all         # Copy all public apps
```

## Manifest Generation

The root `manifest.json` is auto-generated:

```bash
pnpm generate-manifest
```

This is run automatically as part of `pnpm release`.

## What NOT to Do

- **NEVER start apps manually** - Moldable handles app lifecycle
- **NEVER use browser tools to test** - Test in Moldable's webviews
- **NEVER use raw Tailwind colors** - Use semantic tokens
- **DON'T build widget views** - they're removed; contribute to the home via `GET /api/moldable/today` instead (see "Today contribution")
