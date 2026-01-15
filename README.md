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

Each app is a self-contained Next.js application:

```
app-name/
├── moldable.json         # App manifest (required)
├── package.json          # Dependencies
├── src/
│   ├── app/
│   │   ├── page.tsx      # Main app view
│   │   ├── widget/       # Widget view (required)
│   │   └── api/moldable/health/  # Health check (required)
│   ├── components/
│   └── lib/
├── public/
│   └── icon.png          # App icon
└── scripts/
    └── moldable-dev.mjs  # Startup script (required)
```

### moldable.json

```json
{
  "name": "App Name",
  "version": "1.0.0",
  "description": "What the app does",
  "author": "Your Name",
  "license": "MIT",
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

### Generating the Manifest

The root `manifest.json` is auto-generated:

```bash
npm run generate-manifest
```

This runs automatically via GitHub Actions on each push.

## Creating a New App

1. Create a new directory with your app name (kebab-case)
2. Copy structure from an existing app (e.g., `todo`)
3. Create your `moldable.json` manifest
4. Implement your app (see [AGENTS.md](AGENTS.md) for guidelines)
5. Run `npm run generate-manifest`
6. Submit a PR

## License

[MIT](LICENSE)

---

Built by [Desiderata LLC](https://desiderata.fyi)
