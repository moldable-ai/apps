import { FileText, Globe, Layers, Loader2, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../lib/moldable-ui'
import type { ArtifactSummary } from '../../shared/types'
import { ConfirmDialog } from './confirm-dialog'
import { PageFrame } from './page-frame'
import { SlideFrame } from './slide-frame'

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return ''
  const diff = Date.now() - then
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

interface ArtifactGridProps {
  artifacts: ArtifactSummary[]
  workspaceId?: string
  onOpen: (id: string, title: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  creating?: boolean
}

export function ArtifactGrid({
  artifacts,
  workspaceId,
  onOpen,
  onNew,
  onDelete,
  creating,
}: ArtifactGridProps) {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-6 pb-[var(--chat-safe-padding)]">
      {/* Scope row — no app-name header (the host titlebar already names the app). */}
      <header className="mb-6 flex items-center justify-between gap-4">
        <span className="text-muted-foreground text-sm">
          {artifacts.length === 0
            ? 'No artifacts yet'
            : `${artifacts.length} artifact${artifacts.length === 1 ? '' : 's'}`}
        </span>
        <Button onClick={onNew} disabled={creating} className="cursor-pointer">
          {creating ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}
          New artifact
        </Button>
      </header>

      {artifacts.length === 0 ? (
        <button
          onClick={onNew}
          className="border-border hover:border-primary/50 hover:bg-accent/40 flex aspect-[16/10] w-full max-w-sm cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed transition-colors"
        >
          <Plus className="text-muted-foreground size-8" />
          <span className="text-muted-foreground text-sm">
            Create your first artifact
          </span>
        </button>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {artifacts.map((artifact) => (
            <ArtifactCard
              key={artifact.id}
              artifact={artifact}
              workspaceId={workspaceId}
              onOpen={onOpen}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface ArtifactCardProps {
  artifact: ArtifactSummary
  workspaceId?: string
  onOpen: (id: string, title: string) => void
  onDelete: (id: string) => void
}

function ArtifactCard({
  artifact,
  workspaceId,
  onOpen,
  onDelete,
}: ArtifactCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const isPage = artifact.kind === 'page'
  const meta = isPage
    ? 'Page'
    : `${artifact.slideCount} slide${artifact.slideCount === 1 ? '' : 's'}`
  return (
    <div className="border-border bg-card hover:border-primary/40 group relative overflow-hidden rounded-xl border shadow-sm transition-all hover:shadow-md">
      <button
        onClick={() => onOpen(artifact.id, artifact.title)}
        className="block w-full cursor-pointer text-left"
      >
        <div className="bg-muted relative aspect-[16/9] w-full overflow-hidden">
          {isPage ? (
            <PageFrame
              workspaceId={workspaceId}
              artifactId={artifact.id}
              version={artifact.updatedAt}
              thumb
              className="h-full w-full"
              title={`${artifact.title} preview`}
            />
          ) : artifact.slideCount > 0 ? (
            <SlideFrame
              workspaceId={workspaceId}
              deckId={artifact.id}
              version={artifact.updatedAt}
              active={0}
              thumb
              className="pointer-events-none h-full w-full border-0"
              title={`${artifact.title} preview`}
            />
          ) : (
            <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
              Empty
            </div>
          )}
          <span className="bg-background/80 text-muted-foreground absolute left-2 top-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold shadow">
            {isPage ? (
              <FileText className="size-3" />
            ) : (
              <Layers className="size-3" />
            )}
            {isPage ? 'Page' : 'Deck'}
          </span>
          {artifact.publishPending ? (
            <span className="bg-background/85 text-foreground absolute right-2 top-2 flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium shadow">
              <Loader2 className="size-3 animate-spin" /> Publishing
            </span>
          ) : artifact.published ? (
            <span className="bg-background/85 text-foreground absolute right-2 top-2 flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium shadow">
              <Globe className="size-3 text-emerald-500" /> Live
            </span>
          ) : null}
        </div>
        <div className="px-4 py-3">
          <div className="truncate text-sm font-semibold">{artifact.title}</div>
          <div className="text-muted-foreground mt-0.5 text-xs">
            {meta} · {relativeTime(artifact.updatedAt)}
          </div>
        </div>
      </button>
      <button
        title="Delete artifact"
        onClick={(e) => {
          e.stopPropagation()
          setConfirmOpen(true)
        }}
        className="bg-background/80 text-muted-foreground hover:text-destructive absolute bottom-2 right-2 hidden cursor-pointer rounded-md p-1.5 shadow group-hover:block"
      >
        <Trash2 className="size-4" />
      </button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete "${artifact.title}"?`}
        description="This permanently deletes the artifact and its assets. This can't be undone."
        confirmLabel="Delete artifact"
        destructive
        onConfirm={() => onDelete(artifact.id)}
      />
    </div>
  )
}
