import { useQuery } from '@tanstack/react-query'
import type { CSSProperties } from 'react'
import { useWorkspace } from '@moldable-ai/ui'
import type { PianoSong, SongSummary } from '../shared/song'
import { formatDuration, midiToTone } from './piano-utils'

interface SongsResponse {
  songs: SongSummary[]
}

const GHOST_EXAMPLES: Array<{
  id: string
  title: string
  byline: string
  tone: string
}> = [
  {
    id: 'g-1',
    title: 'Clair de Lune',
    byline: 'C. Debussy',
    tone: midiToTone(60),
  },
  {
    id: 'g-2',
    title: 'Fur Elise',
    byline: 'L. V. Beethoven',
    tone: midiToTone(64),
  },
  { id: 'g-3', title: 'Practice roll', byline: 'Ready', tone: midiToTone(67) },
]

function songByline(song: SongSummary) {
  return song.composer?.trim() || song.artist?.trim() || null
}

function MiniRoll({
  notes,
  tone,
}: {
  notes: PianoSong['notes']
  tone: string
}) {
  if (notes.length === 0) {
    return <div className="h-4" />
  }
  const head = notes.slice(0, 24)
  const minMidi = Math.min(...head.map((n) => n.midi)) - 1
  const maxMidi = Math.max(...head.map((n) => n.midi)) + 1
  const span = Math.max(6, maxMidi - minMidi)
  const totalBeats = head.reduce((sum, n) => sum + Math.max(0.2, n.duration), 0)
  const width = 160
  const height = 22
  const widthPerBeat = width / Math.max(1, totalBeats)
  const gradId = `widget-mini-${tone.replace(/[^a-z0-9]/gi, '')}`

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
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={tone} stopOpacity="0.95" />
          <stop offset="100%" stopColor={tone} stopOpacity="0.7" />
        </linearGradient>
      </defs>
      {head.map((note, index) => {
        const x = cursor * widthPerBeat
        const w = Math.max(1.5, Math.max(0.2, note.duration) * widthPerBeat - 1)
        const y = height - 3 - ((note.midi - minMidi) / span) * (height - 6)
        cursor += Math.max(0.2, note.duration)
        return (
          <rect
            key={`${note.id}-${index}`}
            x={x}
            y={y}
            width={w}
            height={2.5}
            rx="1.25"
            fill={`url(#${gradId})`}
          />
        )
      })}
    </svg>
  )
}

function SongCard({
  title,
  byline,
  noteCount,
  duration,
  tone,
  notes,
  ghost,
}: {
  title: string
  byline?: string | null
  noteCount?: number
  duration?: number
  tone: string
  notes?: PianoSong['notes']
  ghost?: boolean
}) {
  const style = { ['--card-tone' as string]: tone } as CSSProperties
  return (
    <div
      className={`piano-card-tone border-border/50 relative isolate flex flex-col overflow-hidden rounded-lg border ${
        ghost ? 'opacity-45 grayscale' : ''
      }`}
      style={style}
    >
      <div className="flex items-baseline justify-between gap-2 px-2.5 pb-1 pt-2">
        {byline ? (
          <p
            className="truncate text-[8.5px] font-medium tracking-[0.08em]"
            style={{ color: tone }}
            title={byline}
          >
            {byline}
          </p>
        ) : (
          <span />
        )}
        {duration !== undefined ? (
          <span className="piano-mono text-muted-foreground/85 text-[9px]">
            {formatDuration(duration)}
          </span>
        ) : null}
      </div>
      <h3 className="piano-serif text-foreground line-clamp-1 px-2.5 text-[13px] font-semibold leading-tight tracking-tight">
        {title}
      </h3>
      <div className="bg-background/55 border-border/40 mt-1.5 border-t px-2 pb-1.5 pt-1.5 backdrop-blur-sm">
        <MiniRoll notes={notes ?? []} tone={tone} />
        {noteCount !== undefined ? (
          <p className="text-muted-foreground/85 piano-mono mt-0.5 text-[9px]">
            {noteCount} notes
          </p>
        ) : null}
      </div>
    </div>
  )
}

export function Widget() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()

  const songsQuery = useQuery({
    queryKey: ['songs', workspaceId],
    queryFn: async () => {
      const res = await fetchWithWorkspace('/api/songs')
      if (!res.ok) throw new Error('Failed to load songs')
      return (await res.json()) as SongsResponse
    },
  })

  const songs = (songsQuery.data?.songs ?? []).slice(0, 3)

  const previewsQuery = useQuery({
    queryKey: [
      'widget-song-previews',
      workspaceId,
      songs.map((s) => s.id).join(','),
    ],
    enabled: songs.length > 0,
    queryFn: async () => {
      const previews = await Promise.all(
        songs.map(async (s): Promise<[string, PianoSong['notes']]> => {
          const res = await fetchWithWorkspace(`/api/songs/${s.id}`)
          if (!res.ok) return [s.id, []]
          const song = (await res.json()) as PianoSong
          return [s.id, song.notes.slice(0, 24)]
        }),
      )
      return new Map(previews)
    },
  })

  return (
    <div className="bg-background flex h-full flex-col overflow-hidden p-2">
      <div className="min-h-0 flex-1 space-y-1.5 overflow-hidden">
        {songsQuery.isError ? (
          <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-2.5 py-2 text-[11px]">
            Could not load songs
          </div>
        ) : songsQuery.isLoading ? (
          [0, 1, 2].map((item) => (
            <div
              key={item}
              className="bg-muted/40 h-[78px] animate-pulse rounded-lg"
            />
          ))
        ) : songs.length === 0 ? (
          GHOST_EXAMPLES.map((item) => (
            <SongCard
              key={item.id}
              title={item.title}
              byline={item.byline}
              tone={item.tone}
              ghost
            />
          ))
        ) : (
          songs.map((song) => {
            const notes = previewsQuery.data?.get(song.id) ?? []
            const tone = midiToTone(notes[0]?.midi ?? 60)
            return (
              <SongCard
                key={song.id}
                title={song.title}
                byline={songByline(song)}
                noteCount={song.noteCount}
                duration={song.duration}
                tone={tone}
                notes={notes}
              />
            )
          })
        )}
      </div>
    </div>
  )
}
