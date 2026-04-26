import { Archive, Ban, Clock, Inbox, Send, Trash2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface MailFolder {
  id: string
  label: string
  icon: LucideIcon
}

export const folders: MailFolder[] = [
  { id: 'INBOX', label: 'Inbox', icon: Inbox },
  { id: 'SNOOZED', label: 'Snoozed', icon: Clock },
  { id: 'SENT', label: 'Sent', icon: Send },
  { id: 'all', label: 'All Mail', icon: Archive },
  { id: 'SPAM', label: 'Spam', icon: Ban },
  { id: 'TRASH', label: 'Trash', icon: Trash2 },
]

export function folderById(id: string) {
  return folders.find((folder) => folder.id === id) ?? folders[0]!
}
