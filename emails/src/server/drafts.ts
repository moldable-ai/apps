import {
  ensureDir,
  getAppDataDir,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'
import type { ComposerState, MailDraft } from '../client/types'
import { randomUUID } from 'node:crypto'

interface DraftStore {
  version: 1
  drafts: MailDraft[]
}

const EMPTY_STORE: DraftStore = { version: 1, drafts: [] }
const DRAFTS_FILENAME = 'drafts.json'

function draftsPath(workspaceId?: string) {
  return safePath(getAppDataDir(workspaceId), DRAFTS_FILENAME)
}

async function readDraftStore(workspaceId?: string): Promise<DraftStore> {
  const stored = await readJson<DraftStore | null>(
    draftsPath(workspaceId),
    null,
  )
  if (!stored || stored.version !== 1 || !Array.isArray(stored.drafts)) {
    return { ...EMPTY_STORE }
  }
  return stored
}

async function writeDraftStore(
  workspaceId: string | undefined,
  store: DraftStore,
) {
  await ensureDir(getAppDataDir(workspaceId))
  await writeJson(draftsPath(workspaceId), store)
}

function normalizeComposer(
  composer: ComposerState,
  draftId: string,
): ComposerState {
  return {
    mode: composer.mode,
    draftId,
    to: composer.to,
    cc: composer.cc,
    bcc: composer.bcc,
    subject: composer.subject,
    body: composer.body,
    threadId: composer.threadId,
  }
}

export async function listDrafts(workspaceId?: string) {
  const store = await readDraftStore(workspaceId)
  return store.drafts.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function saveDraft(
  workspaceId: string | undefined,
  composer: ComposerState,
) {
  const store = await readDraftStore(workspaceId)
  const now = Date.now()
  const id = composer.draftId?.trim() || randomUUID()
  const existing = store.drafts.find((draft) => draft.id === id)
  const nextDraft: MailDraft = {
    id,
    composer: normalizeComposer(composer, id),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }

  await writeDraftStore(workspaceId, {
    version: 1,
    drafts: [nextDraft, ...store.drafts.filter((draft) => draft.id !== id)],
  })
  return nextDraft
}

export async function deleteDraft(workspaceId: string | undefined, id: string) {
  const store = await readDraftStore(workspaceId)
  const nextDrafts = store.drafts.filter((draft) => draft.id !== id)
  if (nextDrafts.length !== store.drafts.length) {
    await writeDraftStore(workspaceId, { version: 1, drafts: nextDrafts })
  }
}
