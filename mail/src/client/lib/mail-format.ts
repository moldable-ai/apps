import type {
  ComposerState,
  MailMessageDetail,
  MailMessageSummary,
} from '../types'

export function senderName(from: string) {
  return (
    from
      .replace(/<[^>]+>/g, '')
      .replaceAll('"', '')
      .trim() || from
  )
}

export function emailAddress(from: string) {
  return from.match(/<([^>]+)>/)?.[1] ?? from
}

export function initials(from: string) {
  const name = senderName(from)
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) {
    const word = parts[0]
    return (word[0] ?? '?').concat(word[1] ?? '').toUpperCase()
  }
  return (parts[0][0] ?? '?').concat(parts[1][0] ?? '').toUpperCase()
}

function domainFromAddress(from: string) {
  const address = emailAddress(from)
  const match = address.match(/@([^>\s]+)/)
  return match?.[1]?.toLowerCase() ?? ''
}

const AVATAR_SEEDS = [
  'oklch(0.72 0.13 30)',
  'oklch(0.72 0.13 80)',
  'oklch(0.7 0.11 150)',
  'oklch(0.7 0.1 200)',
  'oklch(0.7 0.12 250)',
  'oklch(0.72 0.12 310)',
  'oklch(0.74 0.12 345)',
]

export function avatarColor(from: string) {
  const source = (senderName(from) || emailAddress(from) || from).toLowerCase()
  let hash = 0
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) >>> 0
  }
  return AVATAR_SEEDS[hash % AVATAR_SEEDS.length]!
}

export function messageDate(message: MailMessageSummary) {
  const raw = message.internalDate || message.date
  const date = raw ? new Date(raw) : null
  return date && !Number.isNaN(date.getTime()) ? date : null
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function formatMessageTime(message: MailMessageSummary) {
  const date = messageDate(message)
  if (!date) return ''

  const today = new Date()
  if (sameDay(date, today)) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }

  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (sameDay(date, yesterday)) return 'Yesterday'

  const startOfYear = new Date(today.getFullYear(), 0, 1).getTime()
  if (date.getTime() >= startOfYear) {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function snoozedUntilDate(message: MailMessageSummary) {
  const date = message.snoozedUntil ? new Date(message.snoozedUntil) : null
  return date && !Number.isNaN(date.getTime()) ? date : null
}

export function formatSnoozedUntilTime(message: MailMessageSummary) {
  const date = snoozedUntilDate(message)
  if (!date) return formatMessageTime(message)

  const today = new Date()
  if (sameDay(date, today)) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }

  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  if (sameDay(date, tomorrow)) {
    return `Tomorrow ${date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    })}`
  }

  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  })
}

export function formatLongDate(message: MailMessageSummary) {
  const date = messageDate(message)
  if (!date) return ''

  return date.toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function dayGroupLabel(date: Date) {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (sameDay(date, today)) return 'Today'
  if (sameDay(date, yesterday)) return 'Yesterday'

  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  )
  const startOfDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  )
  const ageDays = Math.floor(
    (startOfToday.getTime() - startOfDate.getTime()) / 86_400_000,
  )

  if (ageDays > 1 && ageDays < 7) {
    return date.toLocaleDateString([], { weekday: 'long' })
  }

  if (ageDays >= 7 && ageDays < 28) {
    return 'Earlier this month'
  }

  return date.toLocaleDateString([], {
    month: 'long',
    year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  })
}

export function snoozeGroupLabel(date: Date) {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const time = date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })

  if (sameDay(date, today)) return `Snoozed until ${time}`
  if (sameDay(date, tomorrow)) return `Snoozed until tomorrow at ${time}`

  return `Snoozed until ${date.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })} at ${time}`
}

export interface MessageGroup {
  key: string
  label: string
  sortTime: number
  messages: MailMessageSummary[]
}

export function groupMessagesByDay(
  messages: MailMessageSummary[],
): MessageGroup[] {
  const groups = new Map<
    string,
    { label: string; sortTime: number; items: MailMessageSummary[] }
  >()

  for (const message of messages) {
    const date = messageDate(message)
    if (!date) continue

    const label = dayGroupLabel(date)
    const existing = groups.get(label)
    if (existing) {
      existing.items.push(message)
      if (date.getTime() > existing.sortTime) existing.sortTime = date.getTime()
    } else {
      groups.set(label, {
        label,
        sortTime: date.getTime(),
        items: [message],
      })
    }
  }

  return Array.from(groups.entries())
    .map(([key, value]) => ({
      key,
      label: value.label,
      sortTime: value.sortTime,
      messages: value.items.sort((a, b) => {
        const aTime = messageDate(a)?.getTime() ?? 0
        const bTime = messageDate(b)?.getTime() ?? 0
        return bTime - aTime
      }),
    }))
    .sort((a, b) => b.sortTime - a.sortTime)
}

export function groupMessagesBySnoozeUntil(
  messages: MailMessageSummary[],
): MessageGroup[] {
  const groups = new Map<
    string,
    { label: string; sortTime: number; items: MailMessageSummary[] }
  >()

  for (const message of messages) {
    const date = snoozedUntilDate(message)
    if (!date) continue

    const label = snoozeGroupLabel(date)
    const existing = groups.get(label)
    if (existing) {
      existing.items.push(message)
      if (date.getTime() < existing.sortTime) existing.sortTime = date.getTime()
    } else {
      groups.set(label, {
        label,
        sortTime: date.getTime(),
        items: [message],
      })
    }
  }

  return Array.from(groups.entries())
    .map(([key, value]) => ({
      key,
      label: value.label,
      sortTime: value.sortTime,
      messages: value.items.sort((a, b) => {
        const aTime = snoozedUntilDate(a)?.getTime() ?? 0
        const bTime = snoozedUntilDate(b)?.getTime() ?? 0
        return aTime - bTime
      }),
    }))
    .sort((a, b) => a.sortTime - b.sortTime)
}

export function cleanSnippet(snippet: string) {
  return snippet
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong'
}

export function emptyComposer(): ComposerState {
  return {
    mode: 'new',
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: '',
  }
}

export function replyComposer(message: MailMessageDetail): ComposerState {
  return {
    mode: 'reply',
    to: emailAddress(message.from),
    cc: '',
    bcc: '',
    subject: message.subject.toLowerCase().startsWith('re:')
      ? message.subject
      : `Re: ${message.subject}`,
    body: '',
    threadId: message.threadId,
  }
}

export { domainFromAddress }
