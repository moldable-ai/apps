import toneMidi from '@tonejs/midi'
import extractZip from 'extract-zip'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const { Midi } = toneMidi

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outputPath = path.join(rootDir, 'src/server/default-song-library.ts')

// A varied set of famous / representative solo classical-guitar pieces from the
// Mutopia Project, spread across different composers (Anonymous, Sor, Carcassi,
// Giuliani, Aguado, Bach) for variety. These are genuine guitar entries in the
// bundled Mutopia guitar index
// (data/song-catalog/mutopia/mutopia-guitar-index.json).
const pieces = [
  {
    id: 'anonymous-spanish-romance',
    title: 'Spanish Romance',
    composer: 'Anonymous',
    mutopiaId: '795',
    sourceUrl: 'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=795',
    midiUrl:
      'https://www.mutopiaproject.org/ftp/Anonymous/spanish-romance/spanish-romance.mid',
    source: 'Mutopia Project',
    provider: 'Mutopia Project',
    license: 'Public Domain',
  },
  {
    id: 'sor-andantino',
    title: 'Andantino',
    composer: 'Fernando Sor',
    mutopiaId: '1810',
    sourceUrl: 'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1810',
    midiUrl:
      'https://www.mutopiaproject.org/ftp/SorF/SorF_Andantino/SorF_Andantino.mid',
    source: 'Mutopia Project',
    provider: 'Mutopia Project',
    license: 'Public Domain',
  },
  {
    id: 'sor-minuetto-op2-no1',
    title: 'Six divertissements pour la guitarre, n°1 Minuetto',
    composer: 'Fernando Sor',
    mutopiaId: '513',
    sourceUrl: 'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=513',
    midiUrl:
      'https://www.mutopiaproject.org/ftp/SorF/O2/sor_op2_1/sor_op2_1.mid',
    source: 'Mutopia Project',
    provider: 'Mutopia Project',
    license: 'Public Domain',
  },
  {
    id: 'carcassi-op60-no7-etude',
    title: 'Etude 7',
    composer: 'Matteo Carcassi',
    mutopiaId: '300',
    sourceUrl: 'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=300',
    midiUrl:
      'https://www.mutopiaproject.org/ftp/CarcassiM/O60/carcassi-op60-07/carcassi-op60-07.mid',
    source: 'Mutopia Project',
    provider: 'Mutopia Project',
    license: 'Public Domain',
  },
  {
    id: 'carcassi-sonatine-op1-no1',
    title: 'Trois Sonatines, No. 1',
    composer: 'Matteo Carcassi',
    mutopiaId: '2165',
    sourceUrl: 'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=2165',
    midiUrl:
      'https://www.mutopiaproject.org/ftp/CarcassiM/O1/carcassi-op1n01/carcassi-op1n01.mid',
    source: 'Mutopia Project',
    provider: 'Mutopia Project',
    license: 'Public Domain',
  },
  {
    id: 'giuliani-op50-no1',
    title: 'Opus 50 No. 1',
    composer: 'Mauro Giuliani',
    mutopiaId: '1329',
    sourceUrl: 'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1329',
    midiUrl:
      'https://www.mutopiaproject.org/ftp/GiulianiM/O50/giuliani-op50n01/giuliani-op50n01.mid',
    source: 'Mutopia Project',
    provider: 'Mutopia Project',
    license: 'Public Domain',
  },
  {
    id: 'aguado-study-a-minor',
    title: 'Study in A Minor',
    composer: 'Dionisio Aguado',
    mutopiaId: '1833',
    sourceUrl: 'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1833',
    midiUrl:
      'https://www.mutopiaproject.org/ftp/AguadoD/aminor-study/aminor-study.mid',
    source: 'Mutopia Project',
    provider: 'Mutopia Project',
    license: 'Public Domain',
  },
  {
    id: 'bach-menuet-in-g-bwv-anh-114',
    title: 'Menuet in G (BWV Anh. 114)',
    composer: 'J. S. Bach',
    mutopiaId: '102',
    sourceUrl: 'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=102',
    midiUrl:
      'https://www.mutopiaproject.org/ftp/BachJS/BWVAnh114/anna-magdalena-04-guitar/anna-magdalena-04-guitar.mid',
    source: 'Mutopia Project',
    provider: 'Mutopia Project',
    license: 'Public Domain',
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

  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'guitar-midi-'))
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
  return `import type { GuitarSong } from '../shared/song'

// Generated by scripts/import-mutopia-songs.mjs from public classical MIDI sources.
export const defaultSongLibrary = ${JSON.stringify(songs, null, 2)} satisfies GuitarSong[]
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
