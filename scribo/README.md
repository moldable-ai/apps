# Scribo Languages

Scribo is a Moldable app for language-learning journal entries with translation, dictionary lookup, and streaming TTS.

## Runtime

- Vite builds the full view (`index.html`) and widget view (`widget.html`).
- Hono serves `/api/*` routes and falls through to Vite during local Moldable runs.
- Workspace data is stored through `@moldable-ai/storage` in the app data directory under `entries/`.

## Commands

```bash
pnpm install
pnpm lint
pnpm check-types
pnpm test
pnpm build
```
