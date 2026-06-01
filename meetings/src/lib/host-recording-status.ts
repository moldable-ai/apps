export type HostMeetingRecordingStatus = {
  active?: boolean
  taskId?: string
  recordingRequestId?: string
  detectionSessionKey?: string
  sessionKey?: string
  readinessLine?: string
  statusLine?: string
  title?: string
  provider?: string
  capture?: {
    active?: boolean
    actualState?: string | null
    degradedReason?: string | null
    lastCrashReason?: string | null
  } | null
  transcription?: {
    provider?: string
    state?: string
    streamMode?: 'mixed' | 'source-separated'
    issue?: string | null
    connectionId?: string | null
    connectionGeneration?: number
    reconnectAttempts?: number
    maxReconnectAttempts?: number
    queuedChunks?: number
    droppedChunks?: number
    replayedChunks?: number
  } | null
}

function cleanTaskId(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function hostRecordingConflictsWithTask(
  status: HostMeetingRecordingStatus | null | undefined,
  allowedTaskId?: string | null,
) {
  if (status?.active !== true) return false

  const hostTaskId = cleanTaskId(status.taskId)
  const allowed = cleanTaskId(allowedTaskId)

  return !allowed || hostTaskId !== allowed
}
