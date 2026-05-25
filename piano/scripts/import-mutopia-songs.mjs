import toneMidi from '@tonejs/midi'
import extractZip from 'extract-zip'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const { Midi } = toneMidi

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outputPath = path.join(rootDir, 'src/server/default-song-library.ts')

const pieces = [
  {
    id: 'fur-elise',
    title: 'Fur Elise',
    composer: 'L. V. Beethoven',
    mutopiaId: '931',
    sourceUrl: 'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=931',
    source: 'Breitkopf & Hartel, 1888',
    editor: 'Stelios Samelis',
  },
  {
    id: 'clair-de-lune',
    title: 'Clair de Lune',
    composer: 'C. Debussy',
    mutopiaId: '1778',
    sourceUrl: 'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1778',
    source: 'E. Fromont, 1905',
    editor: 'Keith OHara',
  },
  {
    id: 'satie-gnossienne-no-1',
    title: 'Gnossienne No. 1',
    composer: 'E. Satie',
    mutopiaId: '2035',
    sourceUrl: 'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=2035',
    source: 'Editions Salabert, Paris, 1913',
    editor: 'Knute Snortum',
    license: 'Creative Commons Attribution-ShareAlike 4.0',
  },
  {
    id: 'debussy-reverie',
    title: 'Rêverie',
    composer: 'C. Debussy',
    sourceUrl: 'https://scorely.org/product/reverie/',
    midiUrl:
      'https://scorely.org/wp-content/plugins/download-attachments-with-js-timer/includes/download.php?id=7274',
    provider: 'Scorely',
    source: 'Free PDF & MIDI download',
    editor: 'Scorely',
    license: 'Free MIDI download; composition public domain',
  },
  {
    id: 'chopin-nocturne-op-9-no-2',
    title: 'Nocturne No. 2 in E-Flat Major, Op. 9 No. 2',
    composer: 'F. F. Chopin',
    mutopiaId: '1590',
    sourceUrl: 'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1590',
    source: 'G. Schirmer, New York, 1881',
    editor: 'Renato Biolcati Rinaldi',
    license: 'Creative Commons Attribution-ShareAlike 3.0',
  },
  {
    id: 'chopin-raindrop-prelude',
    title: 'Raindrop Prelude, Op. 28 No. 15',
    composer: 'F. F. Chopin',
    mutopiaId: '471',
    sourceUrl: 'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=471',
    source: 'Edition Peters',
    editor: 'Magnus Lewis-Smith',
  },
  {
    id: 'beethoven-moonlight-sonata-1',
    title: 'Moonlight Sonata, 1st Movement',
    composer: 'L. V. Beethoven',
    mutopiaId: '276',
    sourceUrl: 'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=276',
    midiZipEntry: 'moonlight1.mid',
    source: 'Berners, 1908; edited by A. Winterberger',
    editor: 'Stewart Holmes',
    license: 'Creative Commons Attribution-ShareAlike 2.5',
  },
  {
    id: 'beethoven-symphony-no-5',
    title: 'Symphony No. 5',
    composer: 'L. V. Beethoven',
    mutopiaId: '941',
    sourceUrl: 'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=941',
    source: 'Breitkopf and Härtel, 1862-1865',
    editor: 'Stelios Samelis; Johannes Heinecke',
  },
]

function decodeHtml(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
}

function midiToPitch(midi) {
  const names = [
    'C',
    'C#',
    'D',
    'D#',
    'E',
    'F',
    'F#',
    'G',
    'G#',
    'A',
    'A#',
    'B',
  ]
  return `${names[midi % 12]}${Math.floor(midi / 12) - 1}`
}

function round(value, places = 3) {
  return Number(value.toFixed(places))
}

async function fetchText(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${url}: ${response.status} ${response.statusText}`,
    )
  }
  return response.text()
}

async function fetchBytes(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${url}: ${response.status} ${response.statusText}`,
    )
  }
  return Buffer.from(await response.arrayBuffer())
}

function findMidiLink(html, sourceUrl, zipped = false) {
  const anchorPattern = /<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi
  let fallback = null

  for (const match of html.matchAll(anchorPattern)) {
    const href = decodeHtml(match[1])
    const text = match[2]
      .replace(/<[^>]+>/g, '')
      .trim()
      .toLowerCase()
    const absoluteUrl = new URL(href, sourceUrl).toString()

    if (!zipped && href.toLowerCase().endsWith('.mid')) {
      fallback = absoluteUrl
    }
    if (
      zipped &&
      href.toLowerCase().endsWith('.zip') &&
      text.includes('midi')
    ) {
      return absoluteUrl
    }
    if (!zipped && (text === 'midi file' || text === '.mid file')) {
      return absoluteUrl
    }
  }

  if (fallback) return fallback
  throw new Error(`No MIDI link found on ${sourceUrl}`)
}

async function readMidiBytes(piece, html) {
  if (piece.midiUrl) {
    return {
      midiUrl: piece.midiUrl,
      bytes: await fetchBytes(piece.midiUrl),
    }
  }

  const midiUrl = findMidiLink(
    html,
    piece.sourceUrl,
    Boolean(piece.midiZipEntry),
  )
  const bytes = await fetchBytes(midiUrl)
  if (!piece.midiZipEntry) {
    return { midiUrl, bytes }
  }

  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'piano-midi-'))
  const zipPath = path.join(tempDir, 'midi.zip')
  await writeFile(zipPath, bytes)
  await extractZip(zipPath, { dir: tempDir })
  const midiPath = path.join(tempDir, piece.midiZipEntry)
  return {
    midiUrl: `${midiUrl}#${piece.midiZipEntry}`,
    bytes: await readFile(midiPath),
  }
}

function midiToSong(piece, midiUrl, bytes) {
  const midi = new Midi(bytes)
  const secondsPerBeat = midi.header.tempos[0]?.bpm
    ? 60 / midi.header.tempos[0].bpm
    : 0.5
  const bpm = Math.round(60 / secondsPerBeat)
  const beatsPerBar = midi.header.timeSignatures[0]?.timeSignature?.[0] ?? 4
  const notes = midi.tracks
    .flatMap((track) => track.notes)
    .filter(
      (note) => note.midi >= 21 && note.midi <= 108 && note.duration > 0.02,
    )
    .sort(
      (a, b) => a.time - b.time || a.midi - b.midi || b.duration - a.duration,
    )
    .map((note, index) => ({
      id: `n-${String(index + 1).padStart(5, '0')}`,
      pitch: midiToPitch(note.midi),
      midi: note.midi,
      start: round(note.time),
      duration: round(note.duration),
      velocity: round(Math.max(0.25, Math.min(1, note.velocity)), 2),
    }))

  return {
    id: piece.id,
    title: piece.title,
    source: `${piece.composer}; ${piece.source}; Mutopia Project`,
    sourceInfo: {
      provider: piece.provider ?? 'Mutopia Project',
      sourceUrl: piece.sourceUrl,
      midiUrl,
      license: piece.license ?? 'Public Domain',
      composer: piece.composer,
      editor: piece.editor,
      mutopiaId: piece.mutopiaId,
    },
    bpm,
    beatsPerBar,
    defaultSecondsPerBeat: round(secondsPerBeat, 4),
    createdAt: '2026-05-25T00:00:00.000Z',
    updatedAt: '2026-05-25T00:00:00.000Z',
    notes,
  }
}

function renderLibrary(songs) {
  return `import type { PianoSong } from '../shared/song'

// Generated by scripts/import-mutopia-songs.mjs from public classical MIDI sources.
export const defaultSongLibrary = ${JSON.stringify(songs, null, 2)} satisfies PianoSong[]
`
}

await mkdir(path.dirname(outputPath), { recursive: true })

const songs = []
for (const piece of pieces) {
  const html = await fetchText(piece.sourceUrl)
  if (!piece.midiUrl && !html.includes(piece.license ?? 'Public Domain')) {
    throw new Error(
      `${piece.title} is not marked ${piece.license ?? 'Public Domain'} on ${piece.sourceUrl}`,
    )
  }

  const { midiUrl, bytes } = await readMidiBytes(piece, html)
  const song = midiToSong(piece, midiUrl, bytes)
  console.log(`${song.title}: ${song.notes.length} notes from ${midiUrl}`)
  songs.push(song)
}

await writeFile(outputPath, renderLibrary(songs))
console.log(`Wrote ${outputPath}`)
