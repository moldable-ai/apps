# Style example renders

Drop an example image here named after a style preset's `id` and it shows up
automatically as that style's thumbnail in the Style library — no code changes.

- Filename: `<preset-id>.<ext>` where ext is one of: webp, jpg, jpeg, png, avif
- Example: `interior-japandi.webp`, `exterior-tudor.jpg`, `backyard-zen-garden.png`
- Find a style's id in `src/shared/catalog.ts` (the `id` field), or call the
  `redecorate.presets.list` RPC.
- Recommended: 1024×768 (4:3), under ~300 KB. webp/avif keep the grid snappy.

Anything without a matching file falls back to its accent-color gradient tile.

## Batch generation

Use `pnpm generate-style-thumbnails` from the Redecorate app directory to
generate one GPT Image thumbnail per built-in preset through the same Codex
auth path used by Moldable's local AI server.

The generator is intentionally resumable and conservative:

- default batch size is 10 images;
- existing `<preset-id>.<ext>` files are skipped;
- total output is capped at 200 thumbnails by default;
- each preset's own prompt is included verbatim, with only a short wrapper that
  makes the result a readable style-library sample;
- progress and failures are written to `public/styles/.generation/`.

Examples:

```bash
pnpm generate-style-thumbnails --dry-run
pnpm generate-style-thumbnails --limit 8
pnpm generate-style-thumbnails --category interior-styles --limit 12
pnpm generate-style-thumbnails --only interior-japandi,interior-modern
```
