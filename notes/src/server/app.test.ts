import type { Note } from '../lib/types'
import { app } from './app'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

let tempHome: string

function makeNote(id: string, overrides: Partial<Note> = {}): Note {
  const now = new Date().toISOString()

  return {
    id,
    title: `Note ${id}`,
    content: `Content ${id}`,
    isPinned: false,
    isArchived: false,
    isDeleted: false,
    labels: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function api(pathname: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  headers.set('x-moldable-workspace', 'personal')

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  return app.fetch(
    new Request(`http://notes.test${pathname}`, {
      ...init,
      headers,
    }),
  )
}

describe('notes API', () => {
  beforeEach(async () => {
    tempHome = await mkdtemp(path.join(tmpdir(), 'notes-api-'))
    process.env.MOLDABLE_HOME = tempHome
    process.env.MOLDABLE_APP_ID = 'notes'
    delete process.env.MOLDABLE_APP_DATA_DIR
    delete process.env.MOLDABLE_WORKSPACE_ID
  })

  afterEach(async () => {
    await rm(tempHome, { recursive: true, force: true })
  })

  it('updates one note without replacing unrelated notes', async () => {
    const first = makeNote('note-1')
    const second = makeNote('note-2')

    expect(
      await api('/api/notes', {
        method: 'POST',
        body: JSON.stringify(first),
      }),
    ).toHaveProperty('ok', true)
    expect(
      await api('/api/notes', {
        method: 'POST',
        body: JSON.stringify(second),
      }),
    ).toHaveProperty('ok', true)

    const updateResponse = await api('/api/notes/note-1', {
      method: 'PATCH',
      body: JSON.stringify({ title: 'Updated title' }),
    })

    expect(updateResponse.status).toBe(200)

    const listResponse = await api('/api/notes')
    const notes = (await listResponse.json()) as Note[]

    expect(notes).toHaveLength(2)
    expect(notes.find((note) => note.id === 'note-1')?.title).toBe(
      'Updated title',
    )
    expect(notes.find((note) => note.id === 'note-2')?.title).toBe(
      'Note note-2',
    )
  })

  it('permanently deletes only the requested note', async () => {
    await api('/api/notes', {
      method: 'POST',
      body: JSON.stringify(makeNote('note-1')),
    })
    await api('/api/notes', {
      method: 'POST',
      body: JSON.stringify(makeNote('note-2')),
    })

    const deleteResponse = await api('/api/notes/note-1', { method: 'DELETE' })

    expect(deleteResponse.status).toBe(200)

    const listResponse = await api('/api/notes')
    const notes = (await listResponse.json()) as Note[]

    expect(notes.map((note) => note.id)).toEqual(['note-2'])
  })

  it('rejects invalid workspace IDs before storage access', async () => {
    const response = await app.fetch(
      new Request('http://notes.test/api/notes', {
        headers: {
          'x-moldable-workspace': '../personal',
        },
      }),
    )

    expect(response.status).toBe(400)
  })

  it('rejects duplicate note IDs in bulk saves', async () => {
    const response = await api('/api/notes', {
      method: 'POST',
      body: JSON.stringify([makeNote('same-id'), makeNote('same-id')]),
    })

    expect(response.status).toBe(400)

    const listResponse = await api('/api/notes')
    const notes = (await listResponse.json()) as Note[]

    expect(notes).toHaveLength(0)
  })
})
