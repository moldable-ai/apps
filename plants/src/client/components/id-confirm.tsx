'use client'

import { Check, ExternalLink, Leaf } from 'lucide-react'
import { type JSX, useEffect, useState } from 'react'
import {
  Button,
  Spinner,
  cn,
  sendToMoldable,
  useWorkspace,
} from '@moldable-ai/ui'
import type { IdCandidate } from '../../lib/types'
import { ZoomableImage } from './zoomable-image'

type InatMatch = {
  name: string
  commonName?: string
  photo?: string
  wikipediaUrl?: string
}
type WikiSummary = { title: string; extract: string; thumbnail?: string }
type ConfirmResponse = { inaturalist: InatMatch[]; wikipedia?: WikiSummary }

function useReference(name: string) {
  const { fetchWithWorkspace } = useWorkspace()
  const [data, setData] = useState<ConfirmResponse | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!name.trim()) {
      setData(null)
      return
    }
    setLoading(true)
    setData(null)
    fetchWithWorkspace(
      `/api/plants/identify-confirm?name=${encodeURIComponent(name)}`,
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((body: ConfirmResponse | null) => {
        if (!cancelled) setData(body)
      })
      .catch(() => {
        if (!cancelled) setData(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [name, fetchWithWorkspace])

  return { data, loading }
}

function PhotoGrid({ photos }: { photos: InatMatch[] }): JSX.Element {
  return (
    <div className="grid grid-cols-3 gap-2">
      {photos.map((m, i) => (
        <ZoomableImage
          key={i}
          src={m.photo!}
          alt={m.commonName ?? m.name}
          zoomScale={2.6}
          className="bg-muted aspect-square w-full rounded-lg"
          imageClassName="size-full rounded-lg object-cover"
        />
      ))}
    </div>
  )
}

function WikiLine({
  wiki,
  clamp,
}: {
  wiki: WikiSummary
  clamp?: boolean
}): JSX.Element {
  const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(
    wiki.title.replace(/ /g, '_'),
  )}`
  return (
    <div className="space-y-1.5">
      <p
        className={cn(
          'text-muted-foreground text-xs leading-relaxed',
          clamp && 'line-clamp-3',
        )}
      >
        {wiki.extract}
      </p>
      <button
        type="button"
        onClick={() => sendToMoldable({ type: 'moldable:open-url', url })}
        className="text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center gap-1 text-xs"
      >
        <ExternalLink className="size-3" />
        Read on Wikipedia
      </button>
    </div>
  )
}

/**
 * Identity confirmation. During onboarding (unconfirmed) this is a warm,
 * up-front "Does this look like your plant?" with reference photos and one-tap
 * candidate matches. Once confirmed it becomes a calm, always-visible
 * "Reference" section — photos plus a short description to read about the plant.
 */
export function IdConfirm(props: {
  name: string
  confirmed: boolean
  candidates?: IdCandidate[]
  onConfirm: () => void
  onPickCandidate: (c: IdCandidate) => void
}): JSX.Element | null {
  const { name, confirmed, candidates, onConfirm, onPickCandidate } = props
  const { data, loading } = useReference(name)

  const photos = (data?.inaturalist ?? []).filter((m) => m.photo).slice(0, 6)
  const wiki = data?.wikipedia

  // Alternative candidates the user can pick with one tap (excluding the current name).
  const alts = (candidates ?? []).filter(
    (c) => c.name.trim().toLowerCase() !== name.trim().toLowerCase(),
  )

  // ── Confirmed: a plain "Reference" section — never collapsed, since this is
  // where people come to read about and compare their plant. ──
  if (confirmed) {
    if (loading && !data) return null
    if (photos.length === 0 && !wiki) return null
    return (
      <div>
        <div className="text-muted-foreground mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.12em]">
          Reference
        </div>
        <div className="space-y-3">
          {photos.length > 0 && <PhotoGrid photos={photos} />}
          {wiki && <WikiLine wiki={wiki} />}
        </div>
      </div>
    )
  }

  // ── Onboarding: warm, confident confirmation ──
  if (loading && !data) {
    return (
      <div className="bg-card text-muted-foreground flex items-center gap-2 rounded-2xl border p-4 text-xs">
        <Spinner className="size-3.5" />
        Finding reference photos…
      </div>
    )
  }
  // Even if the reference lookup turns up nothing, keep the card so the user can
  // always confirm or rename — never strand a freshly-identified plant.
  return (
    <div className="bg-card overflow-hidden rounded-2xl border p-4">
      <div className="flex items-start gap-2.5">
        <span className="bg-primary/10 text-primary grid size-8 shrink-0 place-items-center rounded-full">
          <Leaf className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-foreground text-sm font-semibold">
            Does this look like your plant?
          </p>
          <p className="text-muted-foreground text-xs">
            {photos.length > 0
              ? 'Compare with reference photos, then confirm.'
              : "Confirm it's right, or rename it above."}
          </p>
        </div>
      </div>

      {photos.length > 0 && (
        <div className="mt-3">
          <PhotoGrid photos={photos} />
        </div>
      )}

      {alts.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <p className="text-muted-foreground text-[11px] font-medium">
            Or pick the closest match
          </p>
          <div className="flex flex-wrap gap-1.5">
            {alts.map((c, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onPickCandidate(c)}
                className="bg-muted/70 text-foreground hover:bg-muted cursor-pointer rounded-full px-3 py-1 text-xs font-medium"
              >
                {c.commonName ?? c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {wiki && (
        <div className="mt-3">
          <WikiLine wiki={wiki} clamp />
        </div>
      )}

      <Button
        type="button"
        onClick={onConfirm}
        className="mt-3.5 h-9 w-full cursor-pointer gap-1.5 rounded-xl"
      >
        <Check className="size-4" />
        Yes, that&apos;s it
      </Button>
    </div>
  )
}
