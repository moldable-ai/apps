import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTheme } from '@moldable-ai/ui'

const baseCss = `
  :root { color-scheme: light; }
  html, body {
    margin: 0;
    min-width: 0;
    background: transparent;
    color: #0f172a;
    overflow-wrap: anywhere;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  }
  body {
    box-sizing: border-box;
    padding: 0;
    font-size: 15px;
    line-height: 1.6;
  }
  img, video {
    max-width: 100% !important;
    height: auto !important;
  }
  table {
    max-width: 100% !important;
    border-collapse: collapse;
  }
  a {
    color: inherit;
    text-underline-offset: 3px;
  }
  blockquote {
    border-left: 2px solid rgba(100, 116, 139, 0.35);
    margin: 12px 0;
    padding: 0 12px;
    color: #475569;
  }
`

const darkAdjustments = `
  :root { color-scheme: dark; }
  html, body {
    color: #e5e7eb !important;
  }
  body,
  body :is(p, div, span, td, th, li, h1, h2, h3, h4, h5, h6, strong, em, b, i, font) {
    color: #e5e7eb !important;
  }
  body [style*="background"],
  body [bgcolor] {
    background-color: transparent !important;
  }
  a,
  a * {
    color: #fb923c !important;
  }
  blockquote {
    border-left-color: rgba(148, 163, 184, 0.45);
    color: #9ca3af !important;
  }
`

function buildHeadContent(dark: boolean) {
  return `
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src http: https: data: blob:; style-src 'unsafe-inline' http: https:; font-src http: https: data:; script-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none';" />
  <style>${baseCss}${dark ? darkAdjustments : ''}</style>
  `
}

function buildEmailDocument(html: string, dark: boolean) {
  const trimmed = html.trim()
  const head = buildHeadContent(dark)

  if (/<html[\s>]/i.test(trimmed)) {
    if (/<head[\s>]/i.test(trimmed)) {
      return /<\/head>/i.test(trimmed)
        ? trimmed.replace(/<\/head>/i, `${head}</head>`)
        : trimmed.replace(/<head([^>]*)>/i, `<head$1>${head}`)
    }
    return trimmed.replace(/<html([^>]*)>/i, `<html$1><head>${head}</head>`)
  }

  return `<!doctype html><html><head>${head}</head><body>${trimmed}</body></html>`
}

function findAnchor(target: EventTarget | null) {
  const node = target as {
    nodeType?: number
    parentElement?: Element | null
    closest?: Element['closest']
  } | null
  if (!node) return null

  const element =
    node.nodeType === 1 ? (node as Element) : (node.parentElement ?? null)
  return element?.closest<HTMLAnchorElement>('a[href]') ?? null
}

function getExternalUrl(anchor: HTMLAnchorElement) {
  return (
    anchor.dataset.externalUrl ||
    anchor.getAttribute('href') ||
    anchor.href ||
    ''
  )
}

export function HtmlEmailFrame({ html }: { html: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const { resolvedTheme } = useTheme()
  const dark = resolvedTheme === 'dark'
  const [height, setHeight] = useState(320)
  const srcDoc = useMemo(() => buildEmailDocument(html, dark), [html, dark])

  const openExternalUrl = useCallback((url: string) => {
    if (!url) return

    if (window.parent !== window) {
      window.parent.postMessage({ type: 'moldable:open-url', url }, '*')
      return
    }

    window.open(url, '_blank', 'noopener,noreferrer')
  }, [])

  const bindExternalLinks = useCallback(() => {
    const doc = iframeRef.current?.contentDocument
    if (!doc) return
    let lastOpened: { url: string; time: number } | null = null

    const handleClick = (event: MouseEvent) => {
      if (event.type === 'mousedown' && event.button !== 0) return
      if (event.type === 'auxclick' && event.button !== 1) return

      const anchor = findAnchor(event.target)
      if (!anchor) return

      const url = getExternalUrl(anchor)
      if (!url || url.startsWith('about:')) return

      event.preventDefault()
      event.stopPropagation()
      const now = Date.now()
      if (lastOpened?.url === url && now - lastOpened.time < 500) {
        return
      }
      lastOpened = { url, time: now }
      openExternalUrl(url)
    }

    doc.addEventListener('click', handleClick, true)
    doc.addEventListener('auxclick', handleClick, true)
    doc.addEventListener('mousedown', handleClick, true)
  }, [openExternalUrl])

  const resizeToContent = useCallback(() => {
    const doc = iframeRef.current?.contentDocument
    if (!doc) return

    for (const anchor of doc.querySelectorAll('a[href]')) {
      const externalUrl = getExternalUrl(anchor)
      if (externalUrl && !externalUrl.startsWith('about:')) {
        anchor.dataset.externalUrl = externalUrl
        anchor.setAttribute('href', '#')
      }
      anchor.setAttribute('target', '_blank')
      anchor.setAttribute('rel', 'noreferrer noopener')
    }

    const nextHeight = Math.max(
      280,
      Math.ceil(
        Math.max(
          doc.body?.scrollHeight ?? 0,
          doc.documentElement?.scrollHeight ?? 0,
        ),
      ),
    )
    setHeight(nextHeight)

    for (const image of doc.images) {
      if (image.complete) continue
      image.addEventListener('load', resizeToContent, { once: true })
      image.addEventListener('error', resizeToContent, { once: true })
    }
  }, [])

  useEffect(() => {
    // Rebind on theme changes to pick up dark-mode overrides.
    const timer = window.setTimeout(resizeToContent, 80)
    return () => window.clearTimeout(timer)
  }, [srcDoc, resizeToContent])

  return (
    <iframe
      ref={iframeRef}
      title="Email HTML message"
      srcDoc={srcDoc}
      sandbox="allow-same-origin allow-scripts"
      referrerPolicy="no-referrer"
      className="w-full border-0 bg-transparent"
      style={{ height }}
      onLoad={() => {
        setHeight(320)
        bindExternalLinks()
        resizeToContent()
        window.setTimeout(resizeToContent, 160)
        window.setTimeout(resizeToContent, 600)
      }}
    />
  )
}
