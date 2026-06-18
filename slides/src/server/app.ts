import { composeDeckHtml, escapeHtml } from '../shared/render'
import {
  getTemplate,
  getTemplateDetail,
  listTemplates,
  templateTheme,
} from '../shared/templates'
import type { Deck, PublishedInfo } from '../shared/types'
import { editSlideImage, generateSlideImage } from './images'
import {
  getWorkspaceId,
  isValidWorkspaceId,
  jsonError,
  rawWorkspaceId,
} from './moldable'
import {
  OperationError,
  addSlide,
  applyPublishResult,
  applyTemplate,
  createDeck,
  failPublish,
  moveSlide,
  removeDeck,
  removeSlide,
  reorderSlides,
  replaceDeck,
  requestPublish,
  revertDeck,
  setImageStyle,
  unpublish,
  updateDeck,
  updateSlide,
} from './operations'
import {
  getDeck,
  listAssets,
  listDecks,
  listVersions,
  readAsset,
  readTemplateAsset,
  readTemplateThumb,
  stageAsset,
  stageIndexHtml,
  summarize,
  writeAsset,
} from './store'
import { Hono } from 'hono'
import type { Context } from 'hono'

export const app = new Hono()

const APP_ID = process.env.MOLDABLE_APP_ID ?? 'slides'
const CLIENT_REQUEST_HEADER = 'x-slides-client'

app.use('/api/*', async (c, next) => {
  const rawWorkspace = rawWorkspaceId(c)
  if (rawWorkspace && !isValidWorkspaceId(rawWorkspace)) {
    return jsonError(c, 'Invalid workspace id', 400)
  }

  const method = c.req.method.toUpperCase()
  const isRead = method === 'GET' || method === 'HEAD' || method === 'OPTIONS'
  const isHostEndpoint = c.req.path.startsWith('/api/moldable/')
  if (
    !isRead &&
    !isHostEndpoint &&
    c.req.header(CLIENT_REQUEST_HEADER) !== '1'
  ) {
    return jsonError(c, 'Missing Slides client request header', 403)
  }

  await next()
})

function firstImageAsset(files: string[]): string | undefined {
  return files.find((file) => /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(file))
}

function deckPublishMetadata(
  deck: Deck,
  id: string,
  assetFiles: string[],
): Record<string, string> {
  // Only attach a description when the deck has an explicit subtitle — don't
  // stamp boilerplate ("N slide deck published with …") on every deck.
  const description = deck.subtitle?.trim()
  const image = firstImageAsset(assetFiles)
  return {
    sourceAppId: APP_ID,
    deckId: id,
    slideCount: String(deck.slides.length),
    seoTitle: deck.title,
    ...(description ? { description, seoDescription: description } : {}),
    ...(image ? { seoImage: `assets/${image}` } : {}),
  }
}

app.get('/api/moldable/health', (c) => {
  return c.json({ appId: APP_ID, status: 'ok' })
})

// Quiet by default: surface a gentle resume for the latest deck, no attention
// items unless a publish is actually in flight.
app.get('/api/moldable/today', async (c) => {
  try {
    const decks = await listDecks(getWorkspaceId(c))
    const items = decks
      .filter((d) => d.publishPending)
      .map((d) => ({
        kind: 'active',
        title: `Publishing "${d.title}"`,
        subtitle: 'Finishing up the shareable link',
        icon: '🎞️',
      }))
    const latest = decks[0]
    const resume =
      !items.length && latest
        ? {
            title: `Open "${latest.title}"`,
            subtitle: `${latest.slides.length} slide${latest.slides.length === 1 ? '' : 's'}`,
            icon: '🎞️',
          }
        : null
    return c.json({ items, resume, generatedAt: new Date().toISOString() })
  } catch {
    return c.json({
      items: [],
      resume: null,
      generatedAt: new Date().toISOString(),
    })
  }
})

// ---- Deck REST -----------------------------------------------------------

app.get('/api/decks', async (c) => {
  const decks = await listDecks(getWorkspaceId(c))
  return c.json(decks.map(summarize))
})

app.post('/api/decks', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const deck = await createDeck(getWorkspaceId(c), body)
  return c.json(deck, 201)
})

app.get('/api/decks/:id', async (c) => {
  const deck = await getDeck(getWorkspaceId(c), c.req.param('id'))
  if (!deck) return jsonError(c, 'Deck not found', 404)
  return c.json(deck)
})

app.patch('/api/decks/:id', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  return run(c, () => updateDeck(getWorkspaceId(c), c.req.param('id'), body))
})

// Image-style recipe + active preset — saved without bumping updatedAt (no canvas reload).
app.post('/api/decks/:id/image-style', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  return run(c, () => setImageStyle(getWorkspaceId(c), c.req.param('id'), body))
})

app.put('/api/decks/:id', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  return run(c, () => replaceDeck(getWorkspaceId(c), c.req.param('id'), body))
})

app.delete('/api/decks/:id', async (c) => {
  return run(c, async () => {
    await removeDeck(getWorkspaceId(c), c.req.param('id'))
    return { ok: true }
  })
})

// ---- Slide REST ----------------------------------------------------------

app.post('/api/decks/:id/slides', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
  const index = typeof body.index === 'number' ? body.index : undefined
  return run(c, () =>
    addSlide(getWorkspaceId(c), c.req.param('id'), body, index),
  )
})

app.patch('/api/decks/:id/slides/:slideId', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  return run(c, () =>
    updateSlide(
      getWorkspaceId(c),
      c.req.param('id'),
      c.req.param('slideId'),
      body,
    ),
  )
})

app.delete('/api/decks/:id/slides/:slideId', async (c) => {
  return run(c, () =>
    removeSlide(getWorkspaceId(c), c.req.param('id'), c.req.param('slideId')),
  )
})

app.post('/api/decks/:id/slides/reorder', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { order?: unknown }
  return run(c, () =>
    reorderSlides(getWorkspaceId(c), c.req.param('id'), body.order),
  )
})

app.post('/api/decks/:id/slides/:slideId/move', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { toIndex?: number }
  return run(c, () =>
    moveSlide(
      getWorkspaceId(c),
      c.req.param('id'),
      c.req.param('slideId'),
      Number(body.toIndex ?? 0),
    ),
  )
})

// ---- Assets --------------------------------------------------------------

app.get('/api/decks/:id/assets/:file', async (c) => {
  const bytes = await readAsset(
    getWorkspaceId(c),
    c.req.param('id'),
    c.req.param('file'),
  )
  if (!bytes) return c.text('Not found', 404)
  return new Response(new Uint8Array(bytes), {
    headers: { 'Content-Type': contentTypeFor(c.req.param('file')) },
  })
})

app.post('/api/decks/:id/assets', async (c) => {
  const workspaceId = getWorkspaceId(c)
  const id = c.req.param('id')
  const deck = await getDeck(workspaceId, id)
  if (!deck) return jsonError(c, 'Deck not found', 404)
  const body = (await c.req.json().catch(() => ({}))) as {
    fileName?: string
    base64?: string
  }
  const fileName = (body.fileName ?? '').replace(/[^A-Za-z0-9._-]/g, '')
  if (!fileName || !body.base64) {
    return jsonError(c, 'fileName and base64 required', 400)
  }
  await writeAsset(
    workspaceId,
    id,
    fileName,
    Buffer.from(body.base64, 'base64'),
  )
  return c.json({ ok: true, path: `assets/${fileName}` }, 201)
})

// ---- Preview (same bytes as the published artifact) ----------------------

app.get('/api/decks/:id/preview', async (c) => {
  const deck = await getDeck(getWorkspaceId(c), c.req.param('id'))
  if (!deck) return c.text('Deck not found', 404)
  const active = Number(c.req.query('active') ?? '0')
  const html = composeDeckHtml(deck, {
    activeIndex: Number.isFinite(active) ? active : 0,
  })
  return c.html(html)
})

// Path-based preview used by the in-app iframe. The workspace lives in the path
// so relative `assets/<file>` references resolve to the sibling asset route —
// exactly mirroring the published artifact's index.html + assets/ layout.
app.get('/api/preview/:workspace/:id/index.html', async (c) => {
  const workspace = c.req.param('workspace')
  if (!isValidWorkspaceId(workspace)) {
    return jsonError(c, 'Invalid workspace id', 400)
  }
  const deck = await getDeck(workspace, c.req.param('id'))
  if (!deck) return c.text('Deck not found', 404)
  const active = Number(c.req.query('active') ?? '0')
  return c.html(
    composeDeckHtml(deck, {
      activeIndex: Number.isFinite(active) ? active : 0,
    }),
  )
})

app.get('/api/preview/:workspace/:id/assets/:file', async (c) => {
  const workspace = c.req.param('workspace')
  if (!isValidWorkspaceId(workspace)) {
    return jsonError(c, 'Invalid workspace id', 400)
  }
  const bytes = await readAsset(
    workspace,
    c.req.param('id'),
    c.req.param('file'),
  )
  if (!bytes) return c.text('Not found', 404)
  return new Response(new Uint8Array(bytes), {
    headers: { 'Content-Type': contentTypeFor(c.req.param('file')) },
  })
})

// ---- Publish bundle + bridge ---------------------------------------------

// Stage the deck bundle on disk and return absolute source paths. The client
// hands these to the host's artifact-publish flow (which reads files by
// sourcePath). index.html is byte-identical to the live preview.
app.get('/api/decks/:id/stage-publish', async (c) => {
  const workspaceId = getWorkspaceId(c)
  const id = c.req.param('id')
  const deck = await getDeck(workspaceId, id)
  if (!deck) return jsonError(c, 'Deck not found', 404)

  const indexPath = await stageIndexHtml(
    workspaceId,
    id,
    composeDeckHtml(deck, { activeIndex: 0 }),
  )

  const files: Array<{
    path: string
    contentType: string
    sourcePath: string
  }> = [
    {
      path: 'index.html',
      contentType: 'text/html; charset=utf-8',
      sourcePath: indexPath,
    },
  ]

  const assetFiles = await listAssets(workspaceId, id)

  for (const file of assetFiles) {
    files.push({
      path: `assets/${file}`,
      contentType: contentTypeFor(file),
      sourcePath: await stageAsset(workspaceId, id, file),
    })
  }

  return c.json({
    entrypoint: 'index.html',
    title: deck.title,
    metadata: deckPublishMetadata(deck, id, assetFiles),
    files,
  })
})

// Mark a deck as needing publish; the open client completes it.
app.post('/api/decks/:id/publish', async (c) => {
  return run(c, () => requestPublish(getWorkspaceId(c), c.req.param('id')))
})

// Called by the client once publishMoldableArtifact resolves (or fails).
app.post('/api/decks/:id/publish-result', async (c) => {
  const workspaceId = getWorkspaceId(c)
  const id = c.req.param('id')
  const body = (await c.req.json().catch(() => ({}))) as {
    error?: string
    published?: PublishedInfo
  }
  return run(c, () => {
    if (body.error) return failPublish(workspaceId, id, body.error)
    if (body.published) {
      return applyPublishResult(workspaceId, id, body.published)
    }
    throw new OperationError('bad_result', 'published or error required')
  })
})

app.post('/api/decks/:id/unpublish', async (c) => {
  return run(c, () => unpublish(getWorkspaceId(c), c.req.param('id')))
})

// ---- Style templates -----------------------------------------------------

app.get('/api/templates', (c) => {
  return c.json(listTemplates())
})

app.get('/api/templates/:id', (c) => {
  const detail = getTemplateDetail(c.req.param('id'))
  if (!detail) return jsonError(c, 'Template not found', 404)
  return c.json(detail)
})

// Lightweight pre-rendered cover thumbnail for the picker gallery (47 of these
// as <img> beats 47 live deck iframes). 404 → client falls back to a live frame.
app.get('/api/templates/:id/thumb', async (c) => {
  const bytes = await readTemplateThumb(c.req.param('id'))
  if (!bytes) return c.text('Not found', 404)
  return new Response(new Uint8Array(bytes), {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-cache' },
  })
})

// Render a template's sample slides as a deck for the picker gallery.
app.get('/api/templates/:id/preview/index.html', (c) => {
  const template = getTemplate(c.req.param('id'))
  if (!template) return c.text('Template not found', 404)
  const active = Number(c.req.query('active') ?? '0')
  const deck: Deck = {
    id: `tpl-${template.id}`,
    title: template.name,
    subtitle: template.tagline,
    density: 'low',
    templateId: template.id,
    theme: templateTheme(template),
    slides: template.sampleSlides,
    published: null,
    publishPending: false,
    publishError: null,
    createdAt: '',
    updatedAt: '',
  }
  return c.html(
    composeDeckHtml(deck, {
      activeIndex: Number.isFinite(active) ? active : 0,
    }),
  )
})

// QA contact sheet: every slide of a template tiled into one static page, so a
// single screenshot reviews the whole deck. ?cols=N controls the grid width.
app.get('/api/templates/:id/contact.html', (c) => {
  const template = getTemplate(c.req.param('id'))
  if (!template) return c.text('Template not found', 404)
  const cols = Math.max(1, Math.min(4, Number(c.req.query('cols') ?? '3') || 3))
  const tiles = template.sampleSlides
    .map(
      (slide, i) => `
    <div class="tile">
      <iframe src="/api/templates/${template.id}/preview/index.html?thumb=1&active=${i}"
        scrolling="no" loading="eager"></iframe>
      <div class="cap">${i + 1}. ${escapeHtml(slide.name ?? '')}</div>
    </div>`,
    )
    .join('')
  const html = `<!doctype html><html><head><meta charset="utf-8">
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; padding: 28px; background: ${escapeHtml(template.stageBg ?? '#111')};
         font-family: ui-sans-serif, system-ui, sans-serif; }
  .head { color: #fff; mix-blend-mode: difference; margin: 0 4px 22px; }
  .head h1 { font-size: 22px; margin: 0 0 2px; font-weight: 700; }
  .head p { font-size: 13px; margin: 0; opacity: 0.85; }
  .grid { display: grid; grid-template-columns: repeat(${cols}, 1fr); gap: 18px; }
  .tile { background: #fff; border-radius: 10px; overflow: hidden;
          box-shadow: 0 10px 30px -12px rgba(0,0,0,0.5); }
  .tile iframe { display: block; width: 100%; aspect-ratio: 16/9; border: 0; }
  .cap { font-size: 12px; padding: 6px 10px; color: #444; background: #fff;
         border-top: 1px solid #eee; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style></head>
<body>
  <div class="head"><h1>${escapeHtml(template.name)} — ${template.sampleSlides.length} slides</h1>
  <p>${escapeHtml(template.tagline)} · ${template.categories.join(' · ')}</p></div>
  <div class="grid">${tiles}</div>
</body></html>`
  return c.html(html)
})

// QA: the whole library at a glance — every template's cover slide tiled.
app.get('/api/library.html', (c) => {
  const cols = Math.max(2, Math.min(6, Number(c.req.query('cols') ?? '4') || 4))
  const tiles = listTemplates()
    .map(
      (t) => `
    <div class="tile">
      <iframe src="/api/templates/${t.id}/preview/index.html?thumb=1&active=0"
        scrolling="no" loading="eager"></iframe>
      <div class="cap"><b>${escapeHtml(t.name)}</b><span>${escapeHtml(t.categories.join(' · '))}</span></div>
    </div>`,
    )
    .join('')
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  body { margin:0; padding:34px; background:#0e0f12; font-family:ui-sans-serif,system-ui,sans-serif; }
  h1 { color:#fff; font-size:26px; margin:0 0 4px; }
  p { color:#9aa3b2; font-size:14px; margin:0 0 26px; }
  .grid { display:grid; grid-template-columns:repeat(${cols},1fr); gap:20px; }
  .tile { background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 12px 34px -14px rgba(0,0,0,.6); }
  .tile iframe { display:block; width:100%; aspect-ratio:16/9; border:0; }
  .cap { padding:9px 13px; border-top:1px solid #eee; }
  .cap b { display:block; font-size:14px; color:#16181d; }
  .cap span { font-size:11px; color:#7a8290; text-transform:uppercase; letter-spacing:.05em; }
  </style></head><body>
  <h1>Slides — template library</h1>
  <p>${listTemplates().length} studio-grade templates across 11 categories</p>
  <div class="grid">${tiles}</div></body></html>`
  return c.html(html)
})

// Serve a template's bundled image assets (relative `assets/<file>` references
// in template preview HTML resolve here).
app.get('/api/templates/:id/preview/assets/:file', async (c) => {
  const bytes = await readTemplateAsset(c.req.param('file'))
  if (!bytes) return c.text('Not found', 404)
  return new Response(new Uint8Array(bytes), {
    headers: { 'Content-Type': contentTypeFor(c.req.param('file')) },
  })
})

app.post('/api/decks/:id/template', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { templateId?: string }
  return run(c, () => {
    if (!body.templateId) {
      throw new OperationError('missing_template', 'templateId is required')
    }
    return applyTemplate(getWorkspaceId(c), c.req.param('id'), body.templateId)
  })
})

// ---- Version history -----------------------------------------------------

app.get('/api/decks/:id/versions', async (c) => {
  const versions = await listVersions(getWorkspaceId(c), c.req.param('id'))
  return c.json(versions)
})

app.post('/api/decks/:id/revert', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { versionId?: string }
  return run(c, () => {
    if (!body.versionId) {
      throw new OperationError('missing_version', 'versionId is required')
    }
    return revertDeck(getWorkspaceId(c), c.req.param('id'), body.versionId)
  })
})

// ---- AI images -----------------------------------------------------------

app.get('/api/decks/:id/images', async (c) => {
  const files = await listAssets(getWorkspaceId(c), c.req.param('id'))
  return c.json(
    files.map((fileName) => ({ fileName, path: `assets/${fileName}` })),
  )
})

app.post('/api/decks/:id/images/generate', async (c) => {
  const workspaceId = getWorkspaceId(c)
  const id = c.req.param('id')
  const deck = await getDeck(workspaceId, id)
  if (!deck) return jsonError(c, 'Deck not found', 404)
  const body = (await c.req.json().catch(() => ({}))) as {
    prompt?: string
    size?: string
    fileName?: string
    styleRef?: string
  }
  return run(c, () =>
    generateSlideImage(workspaceId, id, {
      prompt: body.prompt ?? '',
      size: body.size,
      fileName: body.fileName,
      styleRef: body.styleRef,
    }),
  )
})

app.post('/api/decks/:id/images/edit', async (c) => {
  const workspaceId = getWorkspaceId(c)
  const id = c.req.param('id')
  const deck = await getDeck(workspaceId, id)
  if (!deck) return jsonError(c, 'Deck not found', 404)
  const body = (await c.req.json().catch(() => ({}))) as {
    source?: string
    prompt?: string
    size?: string
    fileName?: string
  }
  return run(c, () =>
    editSlideImage(workspaceId, id, {
      source: body.source ?? '',
      prompt: body.prompt ?? '',
      size: body.size,
      fileName: body.fileName,
    }),
  )
})

// ---- RPC dispatch (chat-driven editing) ----------------------------------

app.post('/api/moldable/rpc', async (c) => {
  const workspaceId = getWorkspaceId(c)
  const body = (await c.req.json().catch(() => ({}))) as {
    method?: string
    params?: Record<string, unknown>
  }
  const method = body.method ?? ''
  const p = (body.params ?? {}) as Record<string, unknown>
  const deckId = (p.id ?? p.deckId) as string | undefined
  const slideId = p.slideId as string | undefined

  try {
    const result = await dispatch(method, workspaceId, deckId, slideId, p)
    if (result === undefined) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'method_not_found',
            message: `Unknown method: ${method}`,
          },
        },
        404,
      )
    }
    return c.json({ ok: true, result })
  } catch (error) {
    if (error instanceof OperationError) {
      return c.json(
        { ok: false, error: { code: error.code, message: error.message } },
        error.status as 400,
      )
    }
    return c.json(
      {
        ok: false,
        error: {
          code: 'slides_rpc_failed',
          message: error instanceof Error ? error.message : 'RPC failed',
        },
      },
      500,
    )
  }
})

async function dispatch(
  method: string,
  workspaceId: string | undefined,
  deckId: string | undefined,
  slideId: string | undefined,
  p: Record<string, unknown>,
): Promise<unknown> {
  const needDeck = () => {
    if (!deckId)
      throw new OperationError('missing_id', 'id (deck id) is required')
    return deckId
  }
  const needSlide = () => {
    if (!slideId)
      throw new OperationError('missing_slide_id', 'slideId is required')
    return slideId
  }

  switch (method) {
    case 'slides.decks.list':
      return (await listDecks(workspaceId)).map(summarize)
    case 'slides.decks.get': {
      const deck = await getDeck(workspaceId, needDeck())
      if (!deck) {
        throw new OperationError('deck_not_found', `No deck: ${deckId}`, 404)
      }
      return deck
    }
    case 'slides.decks.create':
      return createDeck(workspaceId, p)
    case 'slides.decks.update':
      return updateDeck(workspaceId, needDeck(), p)
    case 'slides.decks.replace':
      return replaceDeck(workspaceId, needDeck(), p)
    case 'slides.decks.delete':
      await removeDeck(workspaceId, needDeck())
      return { ok: true }

    case 'slides.slides.add':
      return addSlide(
        workspaceId,
        needDeck(),
        p.slide ?? p,
        typeof p.index === 'number' ? p.index : undefined,
      )
    case 'slides.slides.update':
      return updateSlide(workspaceId, needDeck(), needSlide(), p.slide ?? p)
    case 'slides.slides.remove':
      return removeSlide(workspaceId, needDeck(), needSlide())
    case 'slides.slides.reorder':
      return reorderSlides(workspaceId, needDeck(), p.order)
    case 'slides.slides.move':
      return moveSlide(
        workspaceId,
        needDeck(),
        needSlide(),
        Number(p.toIndex ?? 0),
      )

    case 'slides.deck.publish':
      return requestPublish(workspaceId, needDeck())
    case 'slides.deck.unpublish':
      return unpublish(workspaceId, needDeck())
    case 'slides.deck.previewUrl':
      return { url: `/api/decks/${needDeck()}/preview` }

    case 'slides.templates.list':
      return listTemplates()
    case 'slides.templates.get': {
      const tid = (p.templateId ?? p.id) as string | undefined
      if (!tid) {
        throw new OperationError('missing_template', 'templateId is required')
      }
      const detail = getTemplateDetail(tid)
      if (!detail) {
        throw new OperationError(
          'template_not_found',
          `No template: ${tid}`,
          404,
        )
      }
      return detail
    }
    case 'slides.decks.applyTemplate': {
      if (typeof p.templateId !== 'string') {
        throw new OperationError('missing_template', 'templateId is required')
      }
      return applyTemplate(workspaceId, needDeck(), p.templateId)
    }

    case 'slides.versions.list':
      return listVersions(workspaceId, needDeck())
    case 'slides.deck.revert': {
      if (typeof p.versionId !== 'string') {
        throw new OperationError('missing_version', 'versionId is required')
      }
      return revertDeck(workspaceId, needDeck(), p.versionId)
    }

    case 'slides.images.list':
      return (await listAssets(workspaceId, needDeck())).map((fileName) => ({
        fileName,
        path: `assets/${fileName}`,
      }))
    case 'slides.images.generate':
      return generateSlideImage(workspaceId, needDeck(), {
        prompt: String(p.prompt ?? ''),
        size: typeof p.size === 'string' ? p.size : undefined,
        fileName: typeof p.fileName === 'string' ? p.fileName : undefined,
      })
    case 'slides.images.edit':
      return editSlideImage(workspaceId, needDeck(), {
        source: String(p.source ?? ''),
        prompt: String(p.prompt ?? ''),
        size: typeof p.size === 'string' ? p.size : undefined,
        fileName: typeof p.fileName === 'string' ? p.fileName : undefined,
      })

    default:
      return undefined
  }
}

// ---- helpers -------------------------------------------------------------

async function run<T>(c: Context, fn: () => Promise<T> | T): Promise<Response> {
  try {
    const result = await fn()
    return c.json(result as Record<string, unknown>)
  } catch (error) {
    if (error instanceof OperationError) {
      return c.json(
        { error: error.message, code: error.code },
        error.status as 400,
      )
    }
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Request failed',
    )
  }
}

function contentTypeFor(file: string): string {
  const ext = file.toLowerCase().split('.').pop() ?? ''
  switch (ext) {
    case 'png':
      return 'image/png'
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'gif':
      return 'image/gif'
    case 'webp':
      return 'image/webp'
    case 'svg':
      return 'image/svg+xml'
    case 'avif':
      return 'image/avif'
    case 'css':
      return 'text/css; charset=utf-8'
    case 'js':
      return 'text/javascript; charset=utf-8'
    case 'json':
      return 'application/json; charset=utf-8'
    case 'woff2':
      return 'font/woff2'
    case 'woff':
      return 'font/woff'
    default:
      return 'application/octet-stream'
  }
}
