import { useEffect } from 'react'
import type {
  MailMessageDetail,
  MailMessageSummary,
  MessageAction,
} from '../types'

function hasOpenTransientSurface() {
  return Boolean(
    document.querySelector(
      [
        '[data-slot="alert-dialog-content"][data-state="open"]',
        '[data-slot="dialog-content"][data-state="open"]',
        '[data-slot="dropdown-menu-content"][data-state="open"]',
        '[data-slot="popover-content"][data-state="open"]',
        '[data-slot="select-content"][data-state="open"]',
      ].join(','),
    ),
  )
}

export function useMailKeyboard({
  disabled,
  messages,
  selectedId,
  selectedMessage,
  currentMessage,
  onSelect,
  onAction,
  onReply,
}: {
  disabled: boolean
  messages: MailMessageSummary[]
  selectedId: string | null
  selectedMessage?: MailMessageSummary
  currentMessage?: MailMessageDetail
  onSelect: (id: string | null) => void
  onAction: (id: string, action: MessageAction) => void
  onReply: (message: MailMessageDetail) => void
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (disabled) return

      const target = event.target as HTMLElement | null
      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable
      ) {
        return
      }

      if (event.metaKey || event.ctrlKey || event.altKey) return

      if (event.key === 'Escape' && selectedId && !hasOpenTransientSurface()) {
        event.preventDefault()
        onSelect(null)
        return
      }

      const currentIndex = messages.findIndex(
        (message) => message.id === selectedId,
      )
      const previousId =
        currentIndex > 0 ? messages[currentIndex - 1]?.id : null
      const nextId =
        currentIndex >= 0 && currentIndex < messages.length - 1
          ? messages[currentIndex + 1]?.id
          : null

      if (event.key === 'ArrowLeft' && selectedId) {
        event.preventDefault()
        if (previousId) onSelect(previousId)
      }

      if (event.key === 'ArrowRight' && selectedId) {
        event.preventDefault()
        if (nextId) onSelect(nextId)
      }

      if (event.key === 'e' && selectedId) {
        event.preventDefault()
        onAction(selectedId, 'archive')
      }

      if (event.key === 's' && selectedMessage) {
        event.preventDefault()
        onAction(
          selectedMessage.id,
          selectedMessage.starred ? 'unstar' : 'star',
        )
      }

      if (event.key === 'u' && selectedMessage) {
        event.preventDefault()
        onAction(
          selectedMessage.id,
          selectedMessage.unread ? 'markRead' : 'markUnread',
        )
      }

      if (event.key === 'r' && currentMessage) {
        event.preventDefault()
        onReply(currentMessage)
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [
    currentMessage,
    disabled,
    messages,
    onAction,
    onReply,
    onSelect,
    selectedId,
    selectedMessage,
  ])
}
