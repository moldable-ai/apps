import type { SqlEditorTab, SqlWorkspaceResponse } from '../../shared/types'
import { DEFAULT_SQL } from './sql'

export function deriveSqlTabTitle(sql: string, fallback = 'Query') {
  const firstLine = sql
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean)

  return firstLine ? firstLine.replace(/\s+/g, ' ').slice(0, 48) : fallback
}

export function displaySqlTabTitle(tab: Pick<SqlEditorTab, 'title'>) {
  return tab.title.trim() || 'SQL Query'
}

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
}

export function createSqlTab(index: number, sql = DEFAULT_SQL): SqlEditorTab {
  const now = new Date().toISOString()

  return {
    id: newId(),
    title: index > 1 ? `SQL Query ${index}` : 'SQL Query',
    sql,
    createdAt: now,
    updatedAt: now,
  }
}

export function normalizeSqlWorkspace(
  connectionId: string,
  workspace: SqlWorkspaceResponse | null | undefined,
): SqlWorkspaceResponse {
  const fallbackTab = createSqlTab(1)
  const tabs = workspace?.tabs.length ? workspace.tabs : [fallbackTab]
  const activeTabId =
    tabs.find((tab) => tab.id === workspace?.activeTabId)?.id ?? tabs[0].id

  return {
    connectionId,
    activeTabId,
    tabs,
    updatedAt: workspace?.updatedAt ?? new Date().toISOString(),
  }
}

export function updateSqlTab(tab: SqlEditorTab, sql: string): SqlEditorTab {
  return {
    ...tab,
    sql,
    updatedAt: new Date().toISOString(),
  }
}

export function renameSqlTab(tab: SqlEditorTab, title: string): SqlEditorTab {
  return {
    ...tab,
    title,
    updatedAt: new Date().toISOString(),
  }
}
