export function buildProjectHash(projectId: string) {
  const params = new URLSearchParams()
  params.set('view', 'project')
  params.set('project', projectId)
  return `#${params.toString()}`
}

export function buildTaskHash(projectId: string, taskId: string) {
  const params = new URLSearchParams()
  params.set('view', 'task')
  params.set('project', projectId)
  params.set('task', taskId)
  return `#${params.toString()}`
}

export function parseTasksHash(hash: string) {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const view = params.get('view')
  const projectId = params.get('project')
  const taskId = params.get('task')

  if (!projectId) return null
  if (view === 'task' && taskId)
    return { type: 'task' as const, projectId, taskId }
  if (view === 'project') return { type: 'project' as const, projectId }
  return null
}
