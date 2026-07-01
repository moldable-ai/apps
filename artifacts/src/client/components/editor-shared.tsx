// Editor chrome shared by the deck editor and the page editor: the toolbar icon
// button, the publish menu (publish/unpublish + live link + republish), and the
// version-history drawer. All are artifact-kind agnostic.
import {
  Check,
  Copy,
  ExternalLink,
  Globe,
  History,
  Loader2,
  RotateCcw,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Api, VersionMeta } from '../lib/api'
import { Button, Input, Switch } from '../lib/moldable-ui'
import type { Artifact } from '../../shared/types'
import { ConfirmDialog } from './confirm-dialog'
import { NetlifyPublishRow } from './netlify-publish'
import { ProviderRow } from './provider-row'

export interface PublishState {
  publishing: boolean
  error?: string | null
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return ''
  const mins = Math.round((Date.now() - then) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

export function postToMoldable(message: Record<string, unknown>) {
  window.parent.postMessage(message, '*')
}

// Unified toolbar icon button — round, tooltip via native title, hover fill.
export function ToolBtn({
  label,
  onClick,
  disabled,
  active,
  destructive,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  active?: boolean
  destructive?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors disabled:cursor-default disabled:opacity-40 ${
        destructive
          ? 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
          : active
            ? 'text-foreground hover:bg-muted'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      {children}
    </button>
  )
}

export function PanelAction({
  children,
  icon,
  onClick,
  disabled,
  emphasis,
}: {
  children: React.ReactNode
  icon: React.ReactNode
  onClick: () => void
  disabled?: boolean
  emphasis?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors disabled:cursor-default disabled:opacity-50 ${
        emphasis
          ? 'text-foreground bg-red-500/10 hover:bg-red-500/15'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}

// Publish: a globe in the action cluster that opens a "Publish to" panel — a
// collapsible row per hosting destination (Moldable's own hosting, plus your own
// Netlify site). Each row keeps its own controls tidy so the surface scales to
// more providers later without clutter. The Moldable row auto-copies its link
// the moment the artifact goes live.
export function PublishMenu({
  artifact,
  api,
  canPublish,
  publishState,
  onPublish,
  onUnpublish,
}: {
  artifact: Artifact
  api: Api
  canPublish: boolean
  publishState: PublishState
  onPublish: (id: string) => Promise<{ url: string } | void>
  onUnpublish: (id: string) => void
}) {
  const published = artifact.published
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [moldableOpen, setMoldableOpen] = useState(true)
  const ref = useRef<HTMLDivElement>(null)
  const busy = publishState.publishing
  // Edited since the last publish? (publish bookkeeping doesn't bump updatedAt.)
  const dirty =
    !!published &&
    !!artifact.updatedAt &&
    new Date(artifact.updatedAt).getTime() >
      new Date(published.publishedAt).getTime()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // best-effort; the copy button is the reliable fallback
    }
  }

  const toggle = async (next: boolean) => {
    if (busy) return
    if (next) {
      const res = await onPublish(artifact.id)
      if (res?.url) await copy(res.url) // auto-copy on publish
    } else {
      onUnpublish(artifact.id)
    }
  }

  return (
    <div ref={ref} className="relative">
      <ToolBtn
        label={
          dirty
            ? 'Edited since publishing — republish'
            : published
              ? 'Published — manage link'
              : 'Publish & share'
        }
        active={open}
        onClick={() => setOpen((v) => !v)}
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <span className="relative inline-flex">
            <Globe
              className={`size-4 ${published ? 'text-emerald-500' : ''}`}
            />
            {dirty ? (
              <span className="ring-background absolute -right-1 -top-1 size-2 rounded-full bg-red-500 ring-2" />
            ) : null}
          </span>
        )}
      </ToolBtn>

      {open ? (
        <div className="border-border bg-popover absolute right-0 z-50 mt-2 w-80 rounded-xl border p-3 shadow-xl">
          <div className="px-1">
            <div className="text-sm font-semibold">Publish to</div>
            <div className="text-muted-foreground text-xs">
              Share a link on Moldable, or deploy to your own Netlify site.
            </div>
          </div>

          <div className="mt-2.5 space-y-1.5">
            {/* Moldable — the built-in host publish. */}
            <ProviderRow
              icon={
                <Globe
                  className={`size-4 ${published ? 'text-emerald-500' : 'text-muted-foreground'}`}
                />
              }
              name="Moldable"
              open={moldableOpen}
              onOpenChange={setMoldableOpen}
              status={
                <div className="flex items-center gap-2">
                  {busy ? (
                    <Loader2 className="text-muted-foreground size-3.5 animate-spin" />
                  ) : dirty ? (
                    <span className="text-[11px] font-medium text-red-500">
                      Edited
                    </span>
                  ) : published ? (
                    <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-500">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      Live
                    </span>
                  ) : null}
                  <Switch
                    checked={!!published || busy}
                    disabled={busy || (!published && !canPublish)}
                    aria-label={
                      published ? 'Unpublish artifact' : 'Publish artifact'
                    }
                    onCheckedChange={toggle}
                  />
                </div>
              }
            >
              {published ? (
                <>
                  {dirty ? (
                    <p className="mb-2 text-xs font-medium text-red-500">
                      Edited since publishing — not live yet.
                    </p>
                  ) : null}
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={published.url}
                      onFocus={(e) => e.currentTarget.select()}
                      aria-label="Published link"
                      className="h-9 flex-1 text-xs"
                    />
                    <button
                      type="button"
                      title="Copy link"
                      onClick={() => copy(published.url)}
                      className="border-border hover:bg-muted inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors"
                    >
                      {copied ? (
                        <Check className="size-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() =>
                        postToMoldable({
                          type: 'moldable:open-url',
                          url: published.url,
                        })
                      }
                    >
                      <ExternalLink className="size-3.5" /> Open
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      disabled={busy}
                      onClick={() => void onPublish(artifact.id)}
                    >
                      {busy ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <span className="relative inline-flex">
                          <RotateCcw className="size-3.5" />
                          {dirty ? (
                            <span className="ring-background absolute -right-1 -top-1 size-1.5 rounded-full bg-red-500 ring-2" />
                          ) : null}
                        </span>
                      )}
                      {busy ? 'Publishing…' : 'Republish'}
                    </Button>
                  </div>
                </>
              ) : !canPublish ? (
                <p className="text-muted-foreground text-xs">
                  Add content first to publish.
                </p>
              ) : (
                <p className="text-muted-foreground text-xs">
                  Create a public, shareable link on Moldable.
                </p>
              )}
              {publishState.error ? (
                <div className="text-destructive mt-2 text-xs">
                  {publishState.error}
                </div>
              ) : null}
            </ProviderRow>

            {/* Netlify — deploy to the user's own account (self-contained). */}
            <NetlifyPublishRow
              artifact={artifact}
              api={api}
              active={open}
              canPublish={canPublish}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function HistoryPanel({
  artifact,
  api,
  onClose,
  onReverted,
}: {
  artifact: Artifact
  api: Api
  onClose: () => void
  onReverted: () => void
}) {
  const [versions, setVersions] = useState<VersionMeta[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revertingId, setRevertingId] = useState<string | null>(null)
  const [confirmVersionId, setConfirmVersionId] = useState<string | null>(null)
  const isPage = artifact.kind === 'page'

  useEffect(() => {
    let active = true
    api
      .listVersions(artifact.id)
      .then((v) => active && setVersions(v))
      .catch(
        (e) => active && setError(e instanceof Error ? e.message : 'Failed'),
      )
    return () => {
      active = false
    }
  }, [api, artifact.id])

  const doRevert = async (versionId: string) => {
    setRevertingId(versionId)
    try {
      await api.revert(artifact.id, versionId)
      onReverted()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Revert failed')
      setRevertingId(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/30"
      onClick={onClose}
    >
      <div
        className="bg-background border-border flex h-full w-80 flex-col border-l shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="border-border flex items-center justify-between border-b px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <History className="size-4" /> Version history
          </span>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 pb-[calc(var(--chat-safe-padding,0px)+0.75rem)]">
          {error ? (
            <p className="text-destructive mb-2 text-xs">{error}</p>
          ) : null}
          {!versions ? (
            <p className="text-muted-foreground text-xs">Loading…</p>
          ) : versions.length === 0 ? (
            <p className="text-muted-foreground text-xs">
              No history yet. Each edit creates a restore point you can revert
              to.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {versions.map((v) => (
                <li
                  key={v.versionId}
                  className="border-border hover:bg-accent/40 flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-xs font-medium">
                      {v.label}
                    </div>
                    <div className="text-muted-foreground text-[11px]">
                      {isPage
                        ? relativeTime(v.createdAt)
                        : `${v.slideCount} slide${v.slideCount === 1 ? '' : 's'} · ${relativeTime(v.createdAt)}`}
                    </div>
                  </div>
                  <button
                    title="Revert to this version"
                    disabled={revertingId !== null}
                    onClick={() => setConfirmVersionId(v.versionId)}
                    className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer rounded p-1 disabled:opacity-40"
                  >
                    {revertingId === v.versionId ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <RotateCcw className="size-4" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmVersionId !== null}
        onOpenChange={(o) => {
          if (!o) setConfirmVersionId(null)
        }}
        title="Revert to this version?"
        description="Your current version is saved first, so you can undo the revert from history."
        confirmLabel="Revert"
        onConfirm={() => {
          const id = confirmVersionId
          setConfirmVersionId(null)
          if (id) void doRevert(id)
        }}
      />
    </div>
  )
}
