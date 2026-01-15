# Moldable Apps

Official collection of apps for [Moldable](https://github.com/moldable-ai/moldable) - your personal software factory.

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

Manifest URL: `https://raw.githubusercontent.com/moldable-ai/apps/main/manifest.json`

## For Developers

### Structure

Each app is a self-contained Next.js application with:

```
app-name/
├── moldable.json      # App manifest (name, version, description, etc.)
├── package.json       # Dependencies
├── src/
│   ├── app/           # Next.js App Router pages
│   │   ├── page.tsx   # Main app view
│   │   └── widget/    # Widget view (shown on Moldable canvas)
│   ├── components/
│   └── lib/
├── public/
│   └── icon.png       # App icon
└── scripts/
    └── moldable-dev.mjs  # Development startup script
```

### moldable.json

The app manifest includes:

```json
{
  "name": "App Name",
  "version": "1.0.0",
  "description": "What the app does",
  "icon": "📦",
  "iconPath": "public/icon.png",
  "widgetSize": "medium",
  "category": "productivity",
  "tags": ["tag1", "tag2"],
  "moldableDependencies": {
    "@moldable/ui": "^0.1.0"
  },
  "env": [
    {
      "key": "API_KEY",
      "name": "API Key",
      "description": "Required for...",
      "required": true
    }
  ]
}
```

### Generating the Manifest

The root `manifest.json` is auto-generated from all app manifests:

```bash
npm run generate-manifest
```

This is run automatically by CI on each push.

## Creating a New App

1. Create a new directory with your app name (kebab-case)
2. Copy the structure from an existing app (e.g., `todo`)
3. Create your `moldable.json` manifest
4. Implement your app
5. Run `npm run generate-manifest` to update the root manifest
6. Submit a PR

## License

MIT
