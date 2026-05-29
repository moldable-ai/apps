import { app, rewriteInternalLinksInMarkdown } from './app'
import { resolveStaticFilePath } from './static'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const previousEnv = {
  MOLDABLE_APP_DATA_DIR: process.env.MOLDABLE_APP_DATA_DIR,
  MOLDABLE_APP_ID: process.env.MOLDABLE_APP_ID,
  MOLDABLE_HOME: process.env.MOLDABLE_HOME,
  MOLDABLE_WORKSPACE_ID: process.env.MOLDABLE_WORKSPACE_ID,
}

let tempHome: string | null = null

const workspaceHeaders = { 'x-moldable-workspace': 'test-workspace' }

async function jsonRequest<T>(url: string, init: RequestInit = {}) {
  const response = await app.request(url, {
    ...init,
    headers: {
      ...workspaceHeaders,
      ...(init.headers ?? {}),
    },
  })
  const body = (await response.json()) as T
  return { body, response }
}

async function writeNote(pathName: string, content: string) {
  return jsonRequest('/api/wiki/file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, path: pathName }),
  })
}

beforeEach(async () => {
  tempHome = await fs.mkdtemp(path.join(os.tmpdir(), 'wiki-test-'))
  delete process.env.MOLDABLE_APP_DATA_DIR
  process.env.MOLDABLE_APP_ID = 'wiki-test'
  process.env.MOLDABLE_HOME = tempHome
  process.env.MOLDABLE_WORKSPACE_ID = 'test-workspace'
})

afterEach(async () => {
  if (tempHome) await fs.rm(tempHome, { force: true, recursive: true })
  tempHome = null

  for (const [key, value] of Object.entries(previousEnv)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe('resolveStaticFilePath', () => {
  it('resolves built asset paths under dist', () => {
    const filePath = resolveStaticFilePath('/assets/index-abc123.js')
    const expectedPath = path.join(
      process.cwd(),
      'dist',
      'assets/index-abc123.js',
    )

    expect(filePath).toBe(expectedPath)
    expect(path.relative(path.join(process.cwd(), 'dist'), filePath)).toBe(
      'assets/index-abc123.js',
    )
  })
})

describe('rewriteInternalLinksInMarkdown', () => {
  it('rewrites explicit wiki and markdown links while preserving aliases and headings', () => {
    const content = [
      'See [[concepts/hello#Intro|Hello]]',
      'Also [Hello](concepts/hello.md#Intro)',
    ].join('\n')

    expect(
      rewriteInternalLinksInMarkdown(
        content,
        'index.md',
        ['index.md', 'concepts/greeting.md'],
        {
          from: 'concepts/hello.md',
          to: 'concepts/greeting.md',
          kind: 'note',
        },
      ),
    ).toBe(
      [
        'See [[concepts/greeting#Intro|Hello]]',
        'Also [Hello](concepts/greeting.md#Intro)',
      ].join('\n'),
    )
  })

  it('rewrites same-folder short wiki links after a note rename', () => {
    expect(
      rewriteInternalLinksInMarkdown(
        'See [[hello]]',
        'concepts/map.md',
        ['concepts/map.md', 'concepts/greeting.md'],
        {
          from: 'concepts/hello.md',
          to: 'concepts/greeting.md',
          kind: 'note',
        },
      ),
    ).toBe('See [[concepts/greeting]]')
  })

  it('rewrites folder-scoped links without touching non-note media links', () => {
    const content = [
      '- [[outputs/README]]',
      '- [readme](outputs/README.md)',
      '- [video](outputs/demo.mp4)',
    ].join('\n')

    expect(
      rewriteInternalLinksInMarkdown(
        content,
        'index.md',
        ['index.md', 'archive/outputs/README.md'],
        {
          from: 'outputs',
          to: 'archive/outputs',
          kind: 'folder',
        },
      ),
    ).toBe(
      [
        '- [[archive/outputs/README]]',
        '- [readme](archive/outputs/README.md)',
        '- [video](outputs/demo.mp4)',
      ].join('\n'),
    )
  })
})

describe('wiki note metadata and search', () => {
  it('parses frontmatter arrays, headings, tags, and property search filters', async () => {
    await writeNote(
      'projects/alpha.md',
      [
        '---',
        'tags:',
        '  - project',
        '  - alpha',
        'status: active',
        'owner: "Rob"',
        '---',
        '# Alpha Project',
        '',
        'The launch plan is ready.',
        '',
        '## Milestones',
      ].join('\n'),
    )

    const { body: file } = await jsonRequest<{
      headings: Array<{ level: number; text: string }>
      properties: Array<{ key: string; type: string; value: string }>
    }>('/api/wiki/file?path=projects%2Falpha.md')

    expect(file.headings).toMatchObject([
      { level: 1, text: 'Alpha Project' },
      { level: 2, text: 'Milestones' },
    ])
    expect(file.properties).toMatchObject([
      { key: 'tags', type: 'tags', value: 'project, alpha' },
      { key: 'status', value: 'active' },
      { key: 'owner', value: 'Rob' },
    ])

    const { body: tagResults } = await jsonRequest<
      Array<{ matchField: string; path: string }>
    >(
      '/api/wiki/search?q=tag%3Aproject%20property%3Astatus%3Aactive%20%22launch%20plan%22',
    )
    expect(tagResults).toMatchObject([
      { matchField: 'tag', path: 'projects/alpha.md' },
    ])

    const { body: pathResults } = await jsonRequest<
      Array<{ matchField: string; path: string }>
    >('/api/wiki/search?q=folder%3Aprojects%20file%3Aalpha')
    expect(pathResults.map((result) => result.path)).toEqual([
      'projects/alpha.md',
    ])
  })

  it('persists explicit property display types outside note markdown', async () => {
    await writeNote('movies/matrix.md', '# The Matrix\n')

    const { body: updated } = await jsonRequest<{
      types: Record<string, string>
    }>('/api/wiki/property-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'rating', type: 'number' }),
    })
    expect(updated.types.rating).toBe('number')

    const { body: fetched } = await jsonRequest<{
      types: Record<string, string>
    }>('/api/wiki/property-types')
    expect(fetched.types.rating).toBe('number')

    const { body: file } = await jsonRequest<{ content: string }>(
      '/api/wiki/file?path=movies%2Fmatrix.md',
    )
    expect(file.content).toBe('# The Matrix\n')
  })

  it('lists and renames properties across the vault', async () => {
    await writeNote(
      'movies/matrix.md',
      ['---', 'category: Movies', 'rating: 4.2', '---', '# The Matrix'].join(
        '\n',
      ),
    )
    await writeNote(
      'movies/arrival.md',
      ['---', 'category: Movies', 'rating: 4.5', '---', '# Arrival'].join('\n'),
    )
    await jsonRequest('/api/wiki/property-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'rating', type: 'number' }),
    })

    const { body: listed } = await jsonRequest<{
      properties: Array<{ key: string; type: string; count: number }>
    }>('/api/wiki/properties')
    expect(listed.properties).toMatchObject([
      { key: 'category', count: 2 },
      { key: 'rating', type: 'number', count: 2 },
    ])

    const { body: renamed } = await jsonRequest<{
      properties: Array<{ key: string; type: string; count: number }>
    }>('/api/wiki/properties/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldKey: 'rating', newKey: 'score' }),
    })
    expect(renamed.properties).toContainEqual({
      key: 'score',
      type: 'number',
      count: 2,
    })

    const { body: matrix } = await jsonRequest<{ content: string }>(
      '/api/wiki/file?path=movies%2Fmatrix.md',
    )
    expect(matrix.content).toContain('score: 4.2')
    expect(matrix.content).not.toContain('rating: 4.2')
  })

  it('persists vault settings outside note markdown', async () => {
    await writeNote('daily/today.md', '# Today\n')

    const { body: updated } = await jsonRequest<{
      showPropertiesInNotes: boolean
      noteFont: string
    }>('/api/wiki/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        showPropertiesInNotes: false,
        noteFont: 'georgia',
      }),
    })
    expect(updated.showPropertiesInNotes).toBe(false)
    expect(updated.noteFont).toBe('georgia')

    const { body: fetched } = await jsonRequest<{
      showPropertiesInNotes: boolean
      noteFont: string
    }>('/api/wiki/settings')
    expect(fetched.showPropertiesInNotes).toBe(false)
    expect(fetched.noteFont).toBe('georgia')

    const { body: file } = await jsonRequest<{ content: string }>(
      '/api/wiki/file?path=daily%2Ftoday.md',
    )
    expect(file.content).toBe('# Today\n')
  })
})

describe('wiki links graph', () => {
  it('returns backlink snippets, unlinked mentions, and broken outbound links', async () => {
    await writeNote(
      'projects/alpha.md',
      [
        '# Alpha Project',
        '',
        'See [[missing-note]] for a link that has not been created.',
      ].join('\n'),
    )
    await writeNote(
      'notes/linking.md',
      'This note links directly to [[projects/alpha]] from the body.',
    )
    await writeNote(
      'notes/mention.md',
      'Alpha Project is mentioned here without an explicit wiki link.',
    )

    const { body: graph } = await jsonRequest<{
      inbound: Array<{ path: string; snippets: string[] }>
      unlinked: Array<{ path: string; snippets: string[] }>
      broken: string[]
    }>('/api/wiki/graph?path=projects%2Falpha.md')

    expect(graph.inbound).toEqual([
      expect.objectContaining({
        path: 'notes/linking.md',
        snippets: [expect.stringContaining('links directly')],
      }),
    ])
    expect(graph.unlinked).toEqual([
      expect.objectContaining({
        path: 'notes/mention.md',
        snippets: [expect.stringContaining('Alpha Project')],
      }),
    ])
    expect(graph.broken).toEqual(['missing-note.md'])
  })
})

describe('wiki daily notes, templates, and commands', () => {
  it('creates daily notes, applies markdown templates, and exposes Cmd+K commands', async () => {
    await writeNote('templates/meeting.md', '# {{title}}\n\nDate: {{date}}\n')
    await writeNote(
      'notes/reference.md',
      ['---', 'tags: [reference, lookup]', '---', '# Reference', ''].join('\n'),
    )

    const today = new Date().toISOString().slice(0, 10)
    const { body: daily } = await jsonRequest<{ path: string; title: string }>(
      '/api/wiki/daily',
      { method: 'POST' },
    )
    expect(daily).toMatchObject({
      path: `daily/${today}.md`,
      title: today,
    })

    const { body: templates } = await jsonRequest<Array<{ path: string }>>(
      '/api/wiki/templates',
    )
    expect(templates.map((template) => template.path)).toEqual([
      'templates/meeting.md',
    ])

    const { body: applied } = await jsonRequest<{
      content: string
      path: string
    }>('/api/wiki/templates/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templatePath: 'templates/meeting.md' }),
    })
    expect(applied.path).toBe('meeting.md')
    expect(applied.content).toContain(`# ${today}`)
    expect(applied.content).toContain(`Date: ${today}`)

    const { body: customContentNote } = await jsonRequest<{
      content: string
      path: string
    }>('/api/wiki/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: '# Built-in shape\n\n## Next steps\n',
        title: 'Built-in shape',
      }),
    })
    expect(customContentNote.path).toBe('built-in-shape.md')
    expect(customContentNote.content).toContain('## Next steps')

    const { body: lookupResults } = await jsonRequest<Array<{ path: string }>>(
      '/api/wiki/search?q=tag%3Alookup',
    )
    expect(lookupResults.map((result) => result.path)).toContain(
      'notes/reference.md',
    )

    const { body: commands } = await jsonRequest<{
      commands: Array<{ id: string; action: { command?: string } }>
    }>('/api/moldable/commands')
    expect(commands.commands).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'wiki-daily-note',
          action: expect.objectContaining({ command: 'wiki-daily-note' }),
        }),
        expect.objectContaining({
          id: 'wiki-open-note:notes/reference.md',
          action: expect.objectContaining({ command: 'wiki-open-file' }),
        }),
      ]),
    )
  })
})

describe('wiki trash recovery', () => {
  it('moves deleted notes to trash and restores them to the original path', async () => {
    await writeNote('notes/remove-me.md', '# Remove Me\n')

    const deleteResponse = await app.request(
      '/api/wiki/file?path=notes%2Fremove-me.md',
      {
        headers: workspaceHeaders,
        method: 'DELETE',
      },
    )
    expect(deleteResponse.status).toBe(200)

    const missingResponse = await app.request(
      '/api/wiki/file?path=notes%2Fremove-me.md',
      { headers: workspaceHeaders },
    )
    expect(missingResponse.status).toBe(404)

    const { body: trash } =
      await jsonRequest<Array<{ id: string; originalPath: string }>>(
        '/api/wiki/trash',
      )
    expect(trash).toEqual([
      expect.objectContaining({ originalPath: 'notes/remove-me.md' }),
    ])

    const restoreResponse = await app.request(
      `/api/wiki/trash/${trash[0]?.id ?? ''}/restore`,
      {
        headers: workspaceHeaders,
        method: 'POST',
      },
    )
    expect(restoreResponse.status).toBe(200)

    const { body: restored } = await jsonRequest<{
      path: string
      title: string
    }>('/api/wiki/file?path=notes%2Fremove-me.md')
    expect(restored).toMatchObject({
      path: 'notes/remove-me.md',
      title: 'Remove Me',
    })
  })

  it('creates a fresh note at a path that was previously moved to trash', async () => {
    await writeNote('notes/reuse.md', '# Old Reuse\n\nold body\n')

    const deleteResponse = await app.request(
      '/api/wiki/file?path=notes%2Freuse.md',
      {
        headers: workspaceHeaders,
        method: 'DELETE',
      },
    )
    expect(deleteResponse.status).toBe(200)

    const { body: created, response } = await jsonRequest<{
      content: string
      path: string
    }>('/api/wiki/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: '# New Reuse\n\nnew body\n',
        path: 'notes/reuse.md',
      }),
    })
    expect(response.status).toBe(201)
    expect(created).toMatchObject({
      content: '# New Reuse\n\nnew body\n',
      path: 'notes/reuse.md',
    })

    const { body: trash } =
      await jsonRequest<Array<{ originalPath: string; title: string }>>(
        '/api/wiki/trash',
      )
    expect(trash).toEqual([
      expect.objectContaining({
        originalPath: 'notes/reuse.md',
        title: 'reuse',
      }),
    ])
  })

  it('keeps separate trash entries when the same path is deleted more than once', async () => {
    await writeNote('notes/repeated.md', '# First\n')
    await app.request('/api/wiki/file?path=notes%2Frepeated.md', {
      headers: workspaceHeaders,
      method: 'DELETE',
    })

    await writeNote('notes/repeated.md', '# Second\n')
    await app.request('/api/wiki/file?path=notes%2Frepeated.md', {
      headers: workspaceHeaders,
      method: 'DELETE',
    })

    const { body: trash } =
      await jsonRequest<
        Array<{ originalPath: string; trashPath: string; title: string }>
      >('/api/wiki/trash')
    expect(trash).toHaveLength(2)
    expect(trash.map((item) => item.originalPath)).toEqual([
      'notes/repeated.md',
      'notes/repeated.md',
    ])
    expect(new Set(trash.map((item) => item.trashPath)).size).toBe(2)
  })
})

describe('wiki RPC steering', () => {
  it('edits properties and organizes entries through Moldable RPC', async () => {
    const { body: created } = await jsonRequest<{
      ok: true
      result: { path: string }
    }>('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'wiki.notes.create',
        params: {
          content: '# RPC Note\n\nBody\n',
          path: 'rpc/note.md',
          title: 'RPC Note',
        },
      }),
    })
    expect(created.result.path).toBe('rpc/note.md')

    const { body: setProperty } = await jsonRequest<{
      ok: true
      result: { content: string }
    }>('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'wiki.properties.set',
        params: {
          key: 'tags',
          path: 'rpc/note.md',
          type: 'tags',
          value: ['rpc', 'chat'],
        },
      }),
    })
    expect(setProperty.result.content).toContain('tags:\n  - rpc\n  - chat')

    const { body: renamedProperties } = await jsonRequest<{
      ok: true
      result: { properties: Array<{ key: string }> }
    }>('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'wiki.properties.rename',
        params: { newKey: 'labels', oldKey: 'tags' },
      }),
    })
    expect(
      renamedProperties.result.properties.map((property) => property.key),
    ).toContain('labels')

    const { body: moved } = await jsonRequest<{
      ok: true
      result: { path: string }
    }>('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'wiki.entries.move',
        params: {
          from: 'rpc/note.md',
          kind: 'note',
          to: 'rpc/moved.md',
        },
      }),
    })
    expect(moved.result.path).toBe('rpc/moved.md')

    await jsonRequest('/api/wiki/tabs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activePath: 'rpc/moved.md',
        tabs: [
          { path: 'rpc/moved.md', title: 'RPC Note', isActive: true },
          { path: 'daily/today.md', title: 'Today', isActive: false },
        ],
      }),
    })

    const { body: tabs } = await jsonRequest<{
      ok: true
      result: {
        activePath: string
        tabs: Array<{ path: string; title: string; isActive: boolean }>
      }
    }>('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method: 'wiki.listTabs' }),
    })
    expect(tabs.result.activePath).toBe('rpc/moved.md')
    expect(tabs.result.tabs).toEqual([
      { path: 'rpc/moved.md', title: 'RPC Note', isActive: true },
      { path: 'daily/today.md', title: 'Today', isActive: false },
    ])

    const { body: methods } = await jsonRequest<{
      ok: true
      result: { methods: string[] }
    }>('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method: 'wiki.rpc.describe' }),
    })
    expect(methods.result.methods).toEqual(
      expect.arrayContaining([
        'wiki.properties.set',
        'wiki.properties.rename',
        'wiki.entries.move',
        'wiki.settings.update',
        'wiki.listTabs',
        'wiki.tabs.list',
      ]),
    )
  })
})
