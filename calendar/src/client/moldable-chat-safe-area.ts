type MoldableChatStateMessage = {
  type?: string
  safePadding?: unknown
}

function applyMoldableChatSafePadding(safePadding: unknown) {
  const value = Number(safePadding)
  if (!Number.isFinite(value)) return

  document.documentElement.style.setProperty(
    '--chat-safe-padding',
    `${Math.max(0, value)}px`,
  )
}

function handleMoldableChatState(
  event: MessageEvent<MoldableChatStateMessage>,
) {
  if (event.data?.type !== 'moldable:chat-state') return
  applyMoldableChatSafePadding(event.data.safePadding)
}

window.addEventListener('message', handleMoldableChatState)
