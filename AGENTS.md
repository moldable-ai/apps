# Moldable Apps Development Guidelines

## Overview

This repository contains official apps for [Moldable](https://github.com/moldable-ai/moldable) - a personal software factory where users create, shape, and discard hyper-personalized applications.

**Website**: https://moldable.sh

## App Structure

Each app is a self-contained Next.js application:

```
app-name/
├── moldable.json           # App manifest (required)
├── package.json            # Dependencies
├── next.config.ts          # Next.js config (must have devIndicators: false)
├── scripts/
│   └── moldable-dev.mjs    # Startup script (required)
├── public/
│   └── icon.png            # App icon
├── src/
│   ├── app/
│   │   ├── layout.tsx      # Root layout
│   │   ├── page.tsx        # Main app view
│   │   ├── globals.css     # Styles
│   │   ├── widget/         # Widget view (required)
│   │   │   ├── layout.tsx  # Must use <WidgetLayout> from @moldable-ai/ui
│   │   │   └── page.tsx    # Glanceable widget content
│   │   └── api/
│   │       └── moldable/
│   │           └── health/
│   │               └── route.ts  # Health check endpoint (required)
│   ├── components/
│   └── lib/
└── tsconfig.json
```

## moldable.json Schema

```json
{
  "name": "App Name",
  "version": "1.0.0",
  "description": "What the app does",
  "author": "Moldable Team",
  "license": "MIT",
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

## Tech Stack

- **Framework**: Next.js 15+ with App Router
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
// app/layout.tsx
import { ThemeProvider } from '@moldable-ai/ui'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
```

```css
/* globals.css */
@import 'tailwindcss';
@import '@moldable-ai/ui/styles';
```

### Widget Layout (Required)

Widget pages must use the WidgetLayout component:

```tsx
// app/widget/layout.tsx
import { WidgetLayout } from '@moldable-ai/ui'

export default function Layout({ children }: { children: React.ReactNode }) {
  return <WidgetLayout>{children}</WidgetLayout>
}
```

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
// src/app/api/moldable/health/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ status: 'ok' })
}
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

## Manifest Generation

The root `manifest.json` is auto-generated:

```bash
npm run generate-manifest
```

This runs on every push via GitHub Actions.

## What NOT to Do

- **NEVER start apps manually** - Moldable handles app lifecycle
- **NEVER use browser tools to test** - Test in Moldable's webviews
- **NEVER use raw Tailwind colors** - Use semantic tokens
- **NEVER skip the widget view** - Every app needs one
