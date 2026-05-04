export interface MailProfile {
  emailAddress?: string
  messagesTotal?: number
  threadsTotal?: number
}

export interface MailStatus {
  authenticated: boolean
  profile: MailProfile | null
}

export interface MailMessageSummary {
  id: string
  threadId: string
  from: string
  to: string
  subject: string
  date: string
  snippet: string
  labelIds: string[]
  unread: boolean
  starred: boolean
  important: boolean
  internalDate: number
  snoozedUntil?: number
  bodyText?: string
  bodyHtmlText?: string
  bodyCached?: boolean
  attachments?: MailAttachment[]
  unsubscribe?: MailUnsubscribe
}

export interface MailMessageDetail extends MailMessageSummary {
  cc: string
  bodyText: string
  bodyHtml: string
  bodyHtmlText: string
  attachments: MailAttachment[]
}

export interface MailAttachment {
  id: string
  filename: string
  mimeType: string
  size: number
  attachmentId?: string
  inline: boolean
}

export interface MailUnsubscribe {
  mailto?: string
  url?: string
  oneClick?: boolean
}

export interface MailContact {
  id: string
  name: string
  email: string
}

export interface MailLabel {
  id: string
  name: string
  type: 'system' | 'user'
  messageListVisibility?: 'hide' | 'show'
  labelListVisibility?: 'labelHide' | 'labelShow' | 'labelShowIfUnread'
  color?: {
    textColor?: string
    backgroundColor?: string
  }
}

export interface MessagesResponse {
  messages: MailMessageSummary[]
  nextPageToken?: string
  resultSizeEstimate: number
}

export interface GeneratedMailSearchQuery {
  naturalLanguageQuery: string
  gmailQuery: string
  labelId: string
  explanation: string
}

export type MailActionGroupId =
  | 'archive'
  | 'label-archive'
  | 'keep-inbox'
  | 'follow-up'
  | 'waiting-on'
  | 'reply-needed'
  | 'read-later'
  | 'unsubscribe-archive'
  | 'trash'
  | 'spam'
  | 'needs-review'

export interface MailActionSuggestion {
  id: string
  messageId: string
  groupId: MailActionGroupId
  confidence: number
  reason?: string
  suggestedLabelId?: string
  suggestedLabelName?: string
  matchedRuleIds?: string[]
}

export interface ActionSuggestionsResponse {
  suggestions: MailActionSuggestion[]
  fingerprint: string
  generatedAt: string
  signalCount: number
}

export interface MailTriageSignalInput {
  account?: string | null
  message: Pick<
    MailMessageSummary,
    'id' | 'from' | 'subject' | 'snippet' | 'labelIds'
  >
  suggestedGroupId?: MailActionGroupId
  finalGroupId: MailActionGroupId
  outcome: 'approved' | 'corrected' | 'label_changed' | 'dismissed'
  suggestedLabelId?: string
  suggestedLabelName?: string
  finalLabelId?: string
  finalLabelName?: string
  reason?: string
}

export interface ComposerState {
  mode: 'new' | 'reply'
  draftId?: string
  to: string
  cc: string
  bcc: string
  subject: string
  body: string
  threadId?: string
}

export interface MailDraft {
  id: string
  composer: ComposerState
  createdAt: number
  updatedAt: number
}

export type MessageAction =
  | 'archive'
  | 'trash'
  | 'untrash'
  | 'markRead'
  | 'markUnread'
  | 'star'
  | 'unstar'
  | 'important'
  | 'unimportant'
  | 'snooze'
  | 'unsnooze'
  | 'spam'
  | 'notSpam'
