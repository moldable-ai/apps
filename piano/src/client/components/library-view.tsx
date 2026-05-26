import { Play, Search, X } from 'lucide-react'
import type { CSSProperties } from 'react'
import { useMemo, useState } from 'react'
import { Button, cn } from '@moldable-ai/ui'
import type { PianoNote, SongSummary } from '../../shared/song'
import { formatDuration, midiToTone } from '../piano-utils'
import { CatalogSearchDialog } from './catalog-search-dialog'

interface LibraryViewProps {
  songs: SongSummary[]
  isLoading: boolean
  isError: boolean
  notePreviewBySong: Map<string, PianoNote[]>
  onSelect: (songId: string) => void
}

function songTone(preview: PianoNote[] | undefined) {
  const firstMidi = preview?.[0]?.midi ?? 60
  return midiToTone(firstMidi)
}

function normalizeForSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

function songByline(song: SongSummary) {
  return song.composer?.trim() || song.artist?.trim() || null
}

function MiniRoll({ notes, tone }: { notes: PianoNote[]; tone: string }) {
  if (notes.length === 0) {
    return (
      <div className="text-muted-foreground/70 piano-serif text-xs italic">
        no notes
      </div>
    )
  }

  const head = notes.slice(0, 24)
  const minMidi = Math.min(...head.map((n) => n.midi)) - 1
  const maxMidi = Math.max(...head.map((n) => n.midi)) + 1
  const span = Math.max(6, maxMidi - minMidi)
  const totalBeats = head.reduce((sum, n) => sum + Math.max(0.2, n.duration), 0)
  const width = 220
  const height = 56
  const widthPerBeat = width / Math.max(1, totalBeats)

  let cursor = 0

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      className="block"
      aria-hidden
    >
      <defs>
        <linearGradient id={`mini-${tone}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={tone} stopOpacity="0.95" />
          <stop offset="100%" stopColor={tone} stopOpacity="0.75" />
        </linearGradient>
      </defs>
      {head.map((note, index) => {
        const x = cursor * widthPerBeat
        const w = Math.max(2, Math.max(0.2, note.duration) * widthPerBeat - 1.5)
        const y = height - 6 - ((note.midi - minMidi) / span) * (height - 14)
        cursor += Math.max(0.2, note.duration)
        return (
          <rect
            key={`${note.id}-${index}`}
            x={x}
            y={y}
            width={w}
            height={4}
            rx="2"
            fill={`url(#mini-${tone})`}
          />
        )
      })}
    </svg>
  )
}

export function LibraryView({
  songs,
  isLoading,
  isError,
  notePreviewBySong,
  onSelect,
}: LibraryViewProps) {
  const hasSongs = songs.length > 0
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [filter, setFilter] = useState('')

  const trimmedFilter = filter.trim()
  const normalizedFilter = trimmedFilter
    ? normalizeForSearch(trimmedFilter)
    : ''
  const filteredSongs = useMemo(() => {
    if (!normalizedFilter) return songs
    return songs.filter((song) => {
      const haystack = normalizeForSearch(
        [song.title, song.composer ?? '', song.artist ?? ''].join(' '),
      )
      return haystack.includes(normalizedFilter)
    })
  }, [songs, normalizedFilter])

  const showFilter = hasSongs && songs.length > 3

  return (
    <div className="animate-piano-view-back relative flex h-full min-h-0 flex-col overflow-hidden">
      <div className="piano-no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-6 pb-[calc(var(--chat-safe-padding,0px)+4rem)] pt-10">
          <section className="animate-piano-chrome-in mb-10 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <h2 className="piano-serif text-foreground text-3xl font-semibold tracking-tight">
                Tap a song to play it.
              </h2>
              <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-6">
                Search public-domain pieces from the Mutopia Project or ask
                Moldable chat to add one from a screenshot.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              className="shrink-0 cursor-pointer gap-1.5 rounded-full px-3.5 text-[12px]"
              onClick={() => setCatalogOpen(true)}
            >
              <Search className="size-3.5" />
              Find sheet music
            </Button>
          </section>

          {showFilter ? (
            <div className="animate-piano-chrome-in mb-5 flex items-center gap-3">
              <div className="relative max-w-sm flex-1">
                <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2" />
                <input
                  type="search"
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                  placeholder="Filter your library…"
                  className={cn(
                    'border-border/70 bg-muted/30 focus:bg-background focus:border-foreground/30 h-8 w-full rounded-full border pl-9 pr-9 text-[12.5px] outline-none transition-colors',
                    'placeholder:text-muted-foreground/80',
                  )}
                />
                {filter ? (
                  <button
                    type="button"
                    onClick={() => setFilter('')}
                    className="text-muted-foreground hover:text-foreground absolute right-1.5 top-1/2 flex size-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full"
                    aria-label="Clear filter"
                  >
                    <X className="size-3" />
                  </button>
                ) : null}
              </div>
              <span className="text-muted-foreground piano-mono shrink-0 text-[11px]">
                {trimmedFilter
                  ? `${filteredSongs.length} of ${songs.length}`
                  : `${songs.length} song${songs.length === 1 ? '' : 's'}`}
              </span>
            </div>
          ) : null}

          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="bg-muted/30 h-52 animate-pulse rounded-2xl"
                />
              ))}
            </div>
          ) : isError ? (
            <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-xl border p-6 text-sm">
              Could not load songs.
            </div>
          ) : !hasSongs ? (
            <div className="border-border/60 rounded-2xl border border-dashed p-10 text-center">
              <p className="piano-serif text-foreground text-lg">
                No songs yet
              </p>
              <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-sm">
                Browse public-domain pieces or ask Moldable chat to add one from
                a screenshot.
              </p>
              <Button
                type="button"
                size="sm"
                className="mt-4 cursor-pointer gap-1.5 rounded-full"
                onClick={() => setCatalogOpen(true)}
              >
                <Search className="size-3.5" />
                Find sheet music
              </Button>
            </div>
          ) : filteredSongs.length === 0 ? (
            <div className="border-border/60 rounded-2xl border border-dashed p-10 text-center">
              <p className="piano-serif text-foreground text-lg">
                Nothing matches “{filter.trim()}”
              </p>
              <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-sm">
                Try a different title, composer, or artist.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4 cursor-pointer rounded-full"
                onClick={() => setFilter('')}
              >
                Clear filter
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredSongs.map((song, index) => {
                const preview = notePreviewBySong.get(song.id) ?? []
                const tone = songTone(preview)
                const byline = songByline(song)
                const style = {
                  ['--card-tone' as string]: tone,
                } as CSSProperties

                return (
                  <button
                    key={song.id}
                    type="button"
                    onClick={() => onSelect(song.id)}
                    style={{ ...style, animationDelay: `${index * 35}ms` }}
                    className={cn(
                      'piano-card-tone animate-piano-card-in group relative isolate flex h-56 flex-col overflow-hidden rounded-2xl text-left',
                      'border-border/50 border shadow-sm',
                      'cursor-pointer transition-all duration-300 ease-out',
                      'focus-visible:ring-primary/40 hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2',
                    )}
                  >
                    <div className="relative z-10 flex flex-1 flex-col gap-1 p-5">
                      {byline ? (
                        <p
                          className="truncate text-[10px] font-medium tracking-[0.08em]"
                          style={{ color: tone }}
                          title={byline}
                        >
                          {byline}
                        </p>
                      ) : null}
                      <h3 className="piano-serif text-foreground line-clamp-2 text-xl font-semibold leading-tight tracking-tight">
                        {song.title}
                      </h3>
                    </div>

                    <div className="bg-background/60 border-border/40 relative z-10 border-t px-4 pb-3 pt-2 backdrop-blur-sm">
                      <MiniRoll notes={preview} tone={tone} />
                      <div className="text-muted-foreground mt-1 flex items-center justify-between text-[11px]">
                        <span className="piano-mono">
                          {song.noteCount} notes ·{' '}
                          {formatDuration(song.duration)}
                        </span>
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium',
                            'bg-foreground/[0.04] text-foreground/70',
                            'group-hover:bg-foreground group-hover:text-background transition-colors',
                          )}
                        >
                          <Play className="size-2.5" />
                          Practice
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <CatalogSearchDialog open={catalogOpen} onOpenChange={setCatalogOpen} />
    </div>
  )
}
