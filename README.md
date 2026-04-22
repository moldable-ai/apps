# Moldable Apps

Official collection of apps for [Moldable](https://github.com/moldable-ai/moldable) - your personal software factory.

**Website**: [moldable.sh](https://moldable.sh)

## Apps

| App                     | Description                                            | Category     |
| ----------------------- | ------------------------------------------------------ | ------------ |
| 📓 **Scribo Languages** | Language learning journal with AI-powered translations | Productivity |
| 🎙️ **Meetings**         | Record, transcribe, and summarize meetings             | Productivity |
| ✅ **Todo**             | Simple task management with quick add                  | Productivity |
| 🗓️ **Calendar**         | Integrated calendar with Google Calendar               | Productivity |
| 📝 **Notes**            | Google Keep-style notes with markdown                  | Productivity |
| 🛠️ **Git**              | Simple Git client for branch management                | Developer    |

## Installation

Apps are installed directly through the Moldable desktop app. Browse available apps and click "Install" to add them to your workspace.

**Manifest URL**: `https://raw.githubusercontent.com/moldable-ai/apps/main/manifest.json`

## Related Repositories

| Repository                                                      | Description                          |
| --------------------------------------------------------------- | ------------------------------------ |
| [moldable-ai/moldable](https://github.com/moldable-ai/moldable) | Desktop app & shared packages        |
| [moldable-ai/apps](https://github.com/moldable-ai/apps)         | Official apps collection (this repo) |

## Shared Packages

Apps use shared packages from npm:

| Package                                                                      | Description                         |
| ---------------------------------------------------------------------------- | ----------------------------------- |
| [`@moldable-ai/ui`](https://www.npmjs.com/package/@moldable-ai/ui)           | UI components, theme system, shadcn |
| [`@moldable-ai/editor`](https://www.npmjs.com/package/@moldable-ai/editor)   | Rich text markdown editor (Lexical) |
| [`@moldable-ai/storage`](https://www.npmjs.com/package/@moldable-ai/storage) | Filesystem storage utilities        |

## For Developers

See [AGENTS.md](AGENTS.md) for detailed development guidelines.

### App Structure

Each app is a self-contained Vite + Hono + React application:

```
app-name/
├── moldable.json         # App manifest (required)
├── package.json          # Dependencies
├── index.html            # Full app HTML entry
├── widget.html           # Widget HTML entry
├── vite.config.ts        # Vite config
├── eslint.config.js      # Shared Moldable app ESLint config
├── src/
│   ├── client/
│   │   ├── app.tsx       # Main app view
│   │   ├── widget.tsx    # Widget view (required)
│   │   └── main.tsx      # React entry
│   ├── server/
│   │   ├── app.ts        # Hono routes, including /api/moldable/health
│   │   └── index.ts      # Server entry
│   ├── components/
│   └── lib/
└── scripts/
    └── moldable-dev.mjs  # Startup script (required)
```

### moldable.json

```json
{
  "name": "App Name",
  "version": "1.0.0",
  "visibility": "public",
  "description": "What the app does",
  "author": "Your Name",
  "license": "FSL-1.1-ALv2",
  "repository": "moldable-ai/apps",
  "icon": "📦",
  "iconPath": "public/icon.png",
  "widgetSize": "medium",
  "category": "productivity",
  "tags": ["tag1", "tag2"],
  "moldableDependencies": {
    "@moldable-ai/ui": "^0.1.0",
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

The `visibility` field controls whether an app is included in the public release:

- `"public"` - App will be copied when running `pnpm release` or `pnpm app:copy:all`
- `"private"` - App will not be copied (useful for local-only apps)

## Release Process

Apps are developed locally in `~/.moldable/shared/apps` and released to this repo:

```bash
# Full release (copy, format, lint, types, manifest, commit)
pnpm release

# Preview what would happen
pnpm release --dry-run

# Skip copying (just format, lint, types, manifest, commit)
pnpm release --skip-copy
```

### Copying Apps

```bash
# Copy specific apps from ~/.moldable/shared/apps to this repo
pnpm app:copy scribo
pnpm app:copy todo notes

# Copy all public apps
pnpm app:copy:all
```

### Updating Local Apps

Sync changes from this repo back to your local development apps:

```bash
# Update specific local apps from this repo
pnpm app:update scribo
pnpm app:update todo notes

# Update all local apps
pnpm app:update:all
```

This preserves local dependencies, lockfiles, and Moldable runtime metadata.

## Creating a New App

1. Create a new directory in `~/.moldable/shared/apps` with your app name (kebab-case)
2. Copy structure from an existing app (e.g., `todo`)
3. Create your `moldable.json` manifest with `"visibility": "public"`
4. Implement your app (see [AGENTS.md](AGENTS.md) for guidelines)
5. Run `pnpm release` to copy, validate, and commit
6. Push and submit a PR

## License

[FSL-1.1-ALv2](LICENSE)

---

Built by [Desiderata LLC](https://desiderata.fyi)
