import { useQueryClient } from '@tanstack/react-query'
import {
  FileText,
  Loader2,
  LogOut,
  PenLine,
  RefreshCcw,
  Search,
  X,
} from 'lucide-react'
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  type AppCommand,
  Button,
  Input,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
  useWorkspace,
} from '@moldable-ai/ui'
import { folders } from './lib/folders'
import { emptyComposer, replyComposer, senderName } from './lib/mail-format'
import {
  useConnectGmail,
  useDeleteMailDraft,
  useDisconnectGmail,
  useLabels,
  useMailContacts,
  useMailDrafts,
  useMailMessage,
  useMailMessages,
  useMailStatus,
  useMessageAction,
  useSaveMailDraft,
  useSendMail,
  useUnsubscribeAndArchive,
  useUpdateMessageLabels,
  useWarmMailFolders,
} from './hooks/use-mail'
import { useMailKeyboard } from './hooks/use-mail-keyboard'
import { Composer } from './components/composer'
import { ConnectScreen } from './components/connect-screen'
import {
  BulkEmailActionDock,
  EmailActionDock,
} from './components/email-action-dock'
import { EmailView } from './components/email-view'
import { InboxView } from './components/inbox-view'
import type {
  ComposerState,
  MailDraft,
  MailMessageDetail,
  MailMessageSummary,
  MessageAction,
} from './types'

const DRAFT_FOLDER_ID = 'DRAFTS'
const READER_CLOSE_ANIMATION_MS = 110

function currentHistoryState() {
  return window.history.state && typeof window.history.state === 'object'
    ? { ...(window.history.state as Record<string, unknown>) }
    : {}
}

const MAIL_BASE_COMMANDS = [
  {
    id: 'mail.compose',
    label: 'Compose email',
    description: 'Start a new message',
    icon: 'pen-line',
    group: 'Mail',
    action: { type: 'message', command: 'mail.compose' },
  },
  {
    id: 'mail.search',
    label: 'Search mail',
    description: 'Focus the mail search field',
    icon: 'search',
    group: 'Mail',
    action: { type: 'message', command: 'mail.search' },
  },
  {
    id: 'mail.refresh',
    label: 'Refresh mail',
    description: 'Fetch the latest messages',
    icon: 'refresh-cw',
    group: 'Mail',
    action: { type: 'message', command: 'mail.refresh' },
  },
  {
    id: 'mail.open-inbox',
    label: 'Open Inbox',
    icon: 'folder',
    group: 'Folders',
    action: { type: 'message', command: 'mail.open-inbox' },
  },
  {
    id: 'mail.open-sent',
    label: 'Open Sent',
    icon: 'send',
    group: 'Folders',
    action: { type: 'message', command: 'mail.open-sent' },
  },
  {
    id: 'mail.open-all',
    label: 'Open All Mail',
    icon: 'archive',
    group: 'Folders',
    action: { type: 'message', command: 'mail.open-all' },
  },
  {
    id: 'mail.open-spam',
    label: 'Open Spam',
    icon: 'ban',
    group: 'Folders',
    action: { type: 'message', command: 'mail.open-spam' },
  },
  {
    id: 'mail.open-trash',
    label: 'Open Trash',
    icon: 'trash-2',
    group: 'Folders',
    action: { type: 'message', command: 'mail.open-trash' },
  },
] satisfies AppCommand[]

const MAIL_DRAFTS_COMMAND = {
  id: 'mail.open-drafts',
  label: 'Open Drafts',
  description: 'Show saved local drafts',
  icon: 'file-text',
  group: 'Folders',
  action: { type: 'message', command: 'mail.open-drafts' },
} satisfies AppCommand

const MAIL_SNOOZED_COMMAND = {
  id: 'mail.open-snoozed',
  label: 'Open Snoozed',
  description: 'Show snoozed messages',
  icon: 'clock',
  group: 'Folders',
  action: { type: 'message', command: 'mail.open-snoozed' },
} satisfies AppCommand

const MAIL_DETAIL_COMMANDS = [
  {
    id: 'mail.reply',
    label: 'Reply to email',
    description: 'Reply to the open email',
    icon: 'reply',
    group: 'Email Actions',
    action: { type: 'message', command: 'mail.reply' },
  },
  {
    id: 'mail.archive',
    label: 'Archive email',
    description: 'Archive the open email',
    icon: 'archive',
    group: 'Email Actions',
    action: { type: 'message', command: 'mail.archive' },
  },
  {
    id: 'mail.trash',
    label: 'Move email to trash',
    description: 'Move the open email to Trash',
    icon: 'trash-2',
    group: 'Email Actions',
    action: { type: 'message', command: 'mail.trash' },
  },
  {
    id: 'mail.spam',
    label: 'Mark email as spam',
    description: 'Move the open email to Spam',
    icon: 'ban',
    group: 'Email Actions',
    action: { type: 'message', command: 'mail.spam' },
  },
  {
    id: 'mail.toggle-read',
    label: 'Mark email read or unread',
    description: 'Toggle read state for the open email',
    icon: 'mail',
    group: 'Email Actions',
    action: { type: 'message', command: 'mail.toggle-read' },
  },
  {
    id: 'mail.toggle-star',
    label: 'Star or unstar email',
    description: 'Toggle starred state for the open email',
    icon: 'star',
    group: 'Email Actions',
    action: { type: 'message', command: 'mail.toggle-star' },
  },
  {
    id: 'mail.toggle-important',
    label: 'Mark email important or not important',
    description: 'Toggle important state for the open email',
    icon: 'sparkles',
    group: 'Email Actions',
    action: { type: 'message', command: 'mail.toggle-important' },
  },
  {
    id: 'mail.add-label',
    label: 'Add label to email',
    description: 'Open the label picker for the open email',
    icon: 'tag',
    group: 'Email Actions',
    action: { type: 'message', command: 'mail.add-label' },
  },
] satisfies AppCommand[]

function hasDraftContent(composer: ComposerState) {
  if (composer.body.trim()) return true
  if (composer.mode === 'reply') {
    return Boolean(composer.cc.trim() || composer.bcc.trim())
  }
  return Boolean(
    composer.to.trim() ||
      composer.cc.trim() ||
      composer.bcc.trim() ||
      composer.subject.trim(),
  )
}

function draftToMessage(draft: MailDraft): MailMessageSummary {
  const subject = draft.composer.subject.trim() || '(No subject)'
  const recipient = draft.composer.to.trim()
  const snippet =
    draft.composer.body.trim() || (recipient ? `To ${recipient}` : '')

  return {
    id: `draft:${draft.id}`,
    threadId: draft.composer.threadId ?? draft.id,
    from: 'Draft',
    to: recipient,
    subject,
    date: new Date(draft.updatedAt).toISOString(),
    snippet,
    labelIds: [DRAFT_FOLDER_ID],
    unread: false,
    starred: false,
    important: false,
    internalDate: draft.updatedAt,
    bodyText: draft.composer.body,
    bodyHtmlText: draft.composer.body,
    bodyCached: true,
    attachments: [],
  }
}

export function App() {
  const queryClient = useQueryClient()
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const connectGmail = useConnectGmail()
  const disconnectGmail = useDisconnectGmail()
  const [folderId, setFolderId] = useState('INBOX')
  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedBulkIds, setSelectedBulkIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [composer, setComposer] = useState<ComposerState | null>(null)
  const [contactSearch, setContactSearch] = useState('')
  const [draftClosePromptOpen, setDraftClosePromptOpen] = useState(false)
  const [readerClosing, setReaderClosing] = useState(false)
  const selectedIdRef = useRef<string | null>(null)
  const readerHistoryOpenRef = useRef(false)
  const readerClosingRef = useRef(false)
  const readerCloseTimerRef = useRef<number | null>(null)

  const statusQuery = useMailStatus()
  const showingDrafts = folderId === DRAFT_FOLDER_ID
  const showingSnoozed = folderId === 'SNOOZED'
  const messagesQuery = useMailMessages({
    folderId: showingDrafts ? 'INBOX' : folderId,
    query,
    enabled: statusQuery.data?.authenticated === true && !showingDrafts,
  })
  const snoozedQuery = useMailMessages({
    folderId: 'SNOOZED',
    query: '',
    enabled: statusQuery.data?.authenticated === true && !showingSnoozed,
  })
  const inboxUnreadQuery = useMailMessages({
    folderId: 'INBOX',
    query: 'is:unread',
    enabled: statusQuery.data?.authenticated === true,
  })
  const draftsQuery = useMailDrafts({
    enabled: statusQuery.data?.authenticated === true,
  })
  const drafts = draftsQuery.data ?? []
  const snoozedCount =
    (showingSnoozed ? messagesQuery.data : snoozedQuery.data)
      ?.resultSizeEstimate ?? 0
  const draftMessages = useMemo(
    () => drafts.map((draft) => draftToMessage(draft)),
    [drafts],
  )
  const inboxMessages = useMemo(
    () => messagesQuery.data?.messages ?? [],
    [messagesQuery.data?.messages],
  )
  const messages = useMemo(
    () => (showingDrafts ? draftMessages : inboxMessages),
    [draftMessages, inboxMessages, showingDrafts],
  )
  const selectedMessage = useMemo(
    () => messages.find((message) => message.id === selectedId),
    [messages, selectedId],
  )
  const selectedIndex = selectedId
    ? messages.findIndex((message) => message.id === selectedId)
    : -1
  const previousMessage =
    selectedIndex > 0 ? messages[selectedIndex - 1] : undefined
  const nextMessage =
    selectedIndex >= 0 && selectedIndex < messages.length - 1
      ? messages[selectedIndex + 1]
      : undefined
  const readerOpen = Boolean(selectedId && selectedMessage)
  const bulkSelectionActive = selectedBulkIds.size > 0

  useEffect(() => {
    selectedIdRef.current = selectedId
  }, [selectedId])

  useEffect(() => {
    if (!composer) setContactSearch('')
  }, [composer])

  const messageQuery = useMailMessage({
    selectedId,
    enabled: statusQuery.data?.authenticated === true,
  })
  const contactsQuery = useMailContacts({
    enabled: statusQuery.data?.authenticated === true,
    query: contactSearch,
  })
  useLabels(statusQuery.data?.authenticated === true)
  useWarmMailFolders({
    enabled: statusQuery.data?.authenticated === true,
  })
  const saveDraftMutation = useSaveMailDraft()
  const deleteDraftMutation = useDeleteMailDraft()
  const updateLabelsMutation = useUpdateMessageLabels()

  const replaceReaderHistoryWithInbox = useCallback(() => {
    if (window.history.state?.mailView !== 'message') return

    const state = currentHistoryState()
    delete state.mailView
    delete state.mailMessageId
    window.history.replaceState(state, '')
  }, [])

  const cancelReaderCloseAnimation = useCallback(() => {
    if (readerCloseTimerRef.current !== null) {
      window.clearTimeout(readerCloseTimerRef.current)
      readerCloseTimerRef.current = null
    }
    readerClosingRef.current = false
    setReaderClosing(false)
  }, [])

  const animateReaderClose = useCallback(() => {
    if (!selectedIdRef.current) return

    if (readerCloseTimerRef.current !== null) {
      window.clearTimeout(readerCloseTimerRef.current)
    }

    readerHistoryOpenRef.current = false
    readerClosingRef.current = true
    setReaderClosing(true)
    readerCloseTimerRef.current = window.setTimeout(() => {
      readerCloseTimerRef.current = null
      readerClosingRef.current = false
      setReaderClosing(false)
      setSelectedId(null)
    }, READER_CLOSE_ANIMATION_MS)
  }, [])

  const openReaderMessage = useCallback(
    (id: string) => {
      cancelReaderCloseAnimation()
      const state = currentHistoryState()
      const nextState = {
        ...state,
        mailView: 'message',
        mailMessageId: id,
      }

      if (readerHistoryOpenRef.current) {
        window.history.replaceState(nextState, '')
      } else {
        window.history.pushState(nextState, '')
        readerHistoryOpenRef.current = true
      }
      setSelectedId(id)
    },
    [cancelReaderCloseAnimation],
  )

  const replaceReaderMessage = useCallback(
    (id: string) => {
      cancelReaderCloseAnimation()
      const state = currentHistoryState()
      window.history.replaceState(
        {
          ...state,
          mailView: 'message',
          mailMessageId: id,
        },
        '',
      )
      readerHistoryOpenRef.current = true
      setSelectedId(id)
    },
    [cancelReaderCloseAnimation],
  )

  const dismissReader = useCallback(() => {
    cancelReaderCloseAnimation()
    readerHistoryOpenRef.current = false
    replaceReaderHistoryWithInbox()
    setSelectedId(null)
  }, [cancelReaderCloseAnimation, replaceReaderHistoryWithInbox])

  const closeReader = useCallback(() => {
    if (
      readerHistoryOpenRef.current &&
      window.history.state?.mailView === 'message'
    ) {
      readerHistoryOpenRef.current = false
      animateReaderClose()
      window.history.back()
      return
    }
    animateReaderClose()
  }, [animateReaderClose])

  const actionMutation = useMessageAction({
    onRemoveCurrent: dismissReader,
  })
  const unsubscribeArchiveMutation = useUnsubscribeAndArchive({
    onRemoveCurrent: dismissReader,
  })
  const sendMutation = useSendMail()

  const runAction = useCallback(
    (id: string, action: MessageAction, until?: number) =>
      actionMutation.mutate({ id, action, until }),
    [actionMutation],
  )

  const openReply = useCallback(
    (message: MailMessageDetail) => setComposer(replyComposer(message)),
    [],
  )

  const handleReplyFromRow = useCallback(
    async (id: string) => {
      try {
        const detail = await queryClient.fetchQuery<MailMessageDetail>({
          queryKey: ['mail-message', workspaceId, id],
          queryFn: async () => {
            const res = await fetchWithWorkspace(`/api/messages/${id}`)
            if (!res.ok) throw new Error('Failed to load message')
            const data = (await res.json()) as { message: MailMessageDetail }
            return data.message
          },
          staleTime: 30_000,
        })
        openReply(detail)
      } catch (error) {
        console.warn('Failed to load message for reply:', error)
      }
    },
    [fetchWithWorkspace, openReply, queryClient, workspaceId],
  )

  const handleSelectMessage = useCallback(
    (id: string | null) => {
      if (bulkSelectionActive && id && !showingDrafts) {
        setSelectedBulkIds((current) => {
          const next = new Set(current)
          if (next.has(id)) {
            next.delete(id)
          } else {
            next.add(id)
          }
          return next
        })
        return
      }

      if (showingDrafts && id?.startsWith('draft:')) {
        const draft = drafts.find((item) => `draft:${item.id}` === id)
        if (draft) setComposer(draft.composer)
        dismissReader()
        return
      }

      if (id) {
        openReaderMessage(id)
      } else {
        closeReader()
      }
    },
    [
      bulkSelectionActive,
      closeReader,
      dismissReader,
      drafts,
      openReaderMessage,
      showingDrafts,
    ],
  )

  const toggleBulkSelected = useCallback((id: string) => {
    setSelectedBulkIds((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const clearBulkSelection = useCallback(() => {
    setSelectedBulkIds(new Set())
  }, [])

  const runBulkAction = useCallback(
    (action: MessageAction, until?: number) => {
      const ids = [...selectedBulkIds]
      setSelectedBulkIds(new Set())
      for (const id of ids) runAction(id, action, until)
    },
    [runAction, selectedBulkIds],
  )

  const runBulkArchiveWithLabel = useCallback(
    (labelId: string) => {
      const ids = [...selectedBulkIds]
      setSelectedBulkIds(new Set())
      for (const id of ids) {
        updateLabelsMutation.mutate({
          id,
          addLabelIds: [labelId],
          removeLabelIds: ['INBOX', 'SNOOZED'],
        })
      }
    },
    [selectedBulkIds, updateLabelsMutation],
  )

  useMailKeyboard({
    disabled: !!composer,
    messages,
    selectedId,
    selectedMessage,
    currentMessage: messageQuery.data,
    onSelect: handleSelectMessage,
    onAction: runAction,
    onReply: openReply,
  })

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as {
        mailView?: unknown
        mailMessageId?: unknown
      } | null

      if (
        state?.mailView === 'message' &&
        typeof state.mailMessageId === 'string'
      ) {
        cancelReaderCloseAnimation()
        readerHistoryOpenRef.current = true
        setSelectedId(state.mailMessageId)
        return
      }

      if (selectedIdRef.current) {
        readerHistoryOpenRef.current = false
        if (!readerClosingRef.current) animateReaderClose()
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [animateReaderClose, cancelReaderCloseAnimation])

  useEffect(() => {
    return () => {
      if (readerCloseTimerRef.current !== null) {
        window.clearTimeout(readerCloseTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (selectedId && !selectedMessage) {
      dismissReader()
    }
  }, [dismissReader, selectedId, selectedMessage])

  useEffect(() => {
    setSelectedBulkIds((current) => {
      if (current.size === 0) return current
      const visibleIds = new Set(messages.map((message) => message.id))
      const next = new Set([...current].filter((id) => visibleIds.has(id)))
      return next.size === current.size ? current : next
    })
  }, [messages])

  useEffect(() => {
    if (showingDrafts && drafts.length === 0 && !draftsQuery.isLoading) {
      setFolderId('INBOX')
    }
  }, [drafts.length, draftsQuery.isLoading, showingDrafts])

  useEffect(() => {
    const handleCommandMenuShortcut = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() !== 'k' ||
        (!event.metaKey && !event.ctrlKey)
      ) {
        return
      }

      event.preventDefault()
      window.parent.postMessage({ type: 'moldable:toggle-command-menu' }, '*')
    }

    window.addEventListener('keydown', handleCommandMenuShortcut, true)
    return () => {
      window.removeEventListener('keydown', handleCommandMenuShortcut, true)
    }
  }, [])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'oauth-success') {
        void queryClient.invalidateQueries({ queryKey: ['mail-status'] })
        void queryClient.invalidateQueries({ queryKey: ['mail-messages'] })
        void queryClient.invalidateQueries({ queryKey: ['mail-contacts'] })
      }

      if (event.data?.type === 'moldable:chat-state') {
        const safePadding = Number(event.data.safePadding)
        if (Number.isFinite(safePadding)) {
          document.documentElement.style.setProperty(
            '--emails-action-dock-safe-padding',
            `${Math.max(0, safePadding)}px`,
          )
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [queryClient])

  useEffect(() => {
    if (!messageQuery.data) return

    window.parent.postMessage(
      {
        type: 'moldable:set-chat-instructions',
        text: `The user is viewing an email from ${senderName(
          messageQuery.data.from,
        )} with subject "${messageQuery.data.subject}". Snippet: ${
          messageQuery.data.snippet
        }`,
      },
      '*',
    )
  }, [messageQuery.data])

  useEffect(() => {
    if (messageQuery.data && messageQuery.data.unread && messageQuery.data.id) {
      runAction(messageQuery.data.id, 'markRead')
    }
  }, [messageQuery.data, runAction])

  const unreadCount = useMemo(
    () =>
      inboxUnreadQuery.data?.resultSizeEstimate ??
      inboxUnreadQuery.data?.messages.length ??
      0,
    [inboxUnreadQuery.data],
  )

  const handleSearch = (event?: FormEvent) => {
    event?.preventDefault()
    setSelectedBulkIds(new Set())
    dismissReader()
    setQuery(searchInput.trim())
  }

  const clearSearch = () => {
    setSelectedBulkIds(new Set())
    setSearchInput('')
    setQuery('')
    dismissReader()
  }

  const handleFolderChange = useCallback(
    (nextFolderId: string) => {
      setSelectedBulkIds(new Set())
      setFolderId(nextFolderId)
      dismissReader()
    },
    [dismissReader],
  )

  const handleSend = () => {
    if (!composer) return
    const draftId = composer.draftId
    sendMutation.mutate(composer, {
      onSuccess: () => {
        setComposer(null)
        setDraftClosePromptOpen(false)
        if (draftId) deleteDraftMutation.mutate(draftId)
      },
    })
  }

  const handleComposerCloseRequest = () => {
    if (!composer) return
    if (!hasDraftContent(composer)) {
      if (composer.draftId) deleteDraftMutation.mutate(composer.draftId)
      setComposer(null)
      setDraftClosePromptOpen(false)
      return
    }
    setDraftClosePromptOpen(true)
  }

  const handleSaveDraftAndClose = () => {
    if (!composer) return
    saveDraftMutation.mutate(composer, {
      onSuccess: () => {
        setComposer(null)
        setDraftClosePromptOpen(false)
      },
    })
  }

  const handleDiscardDraftAndClose = () => {
    const draftId = composer?.draftId
    setComposer(null)
    setDraftClosePromptOpen(false)
    if (draftId) deleteDraftMutation.mutate(draftId)
  }

  const handleDisconnect = () => {
    disconnectGmail.mutate(undefined, {
      onSuccess: () => {
        dismissReader()
        setComposer(null)
        setQuery('')
        setSearchInput('')
      },
    })
  }

  const mailCommands = useMemo(
    () =>
      statusQuery.data?.authenticated
        ? [
            ...MAIL_BASE_COMMANDS,
            ...(snoozedCount > 0 ? [MAIL_SNOOZED_COMMAND] : []),
            ...(drafts.length > 0 ? [MAIL_DRAFTS_COMMAND] : []),
            ...(readerOpen ? MAIL_DETAIL_COMMANDS : []),
          ]
        : [],
    [drafts.length, readerOpen, snoozedCount, statusQuery.data?.authenticated],
  )

  useEffect(() => {
    if (window.parent === window) return

    window.parent.postMessage(
      {
        type: 'moldable:set-app-commands',
        appId: 'mail',
        commands: mailCommands,
      },
      '*',
    )
  }, [mailCommands])

  useEffect(() => {
    const handleCommand = (event: MessageEvent) => {
      if (event.data?.type === 'moldable:navigation-gesture') {
        if (
          event.data.direction === 'back' &&
          selectedId &&
          !composer &&
          !draftClosePromptOpen
        ) {
          closeReader()
        }
        return
      }

      if (event.data?.type !== 'moldable:command') return

      switch (event.data.command) {
        case 'mail.compose':
          setComposer(emptyComposer())
          break
        case 'mail.search':
          dismissReader()
          window.setTimeout(() => {
            document
              .querySelector<HTMLInputElement>('[data-mail-search-input]')
              ?.focus()
          }, 0)
          break
        case 'mail.refresh':
          if (!showingDrafts) void messagesQuery.refetch()
          break
        case 'mail.reply':
          if (messageQuery.data) openReply(messageQuery.data)
          break
        case 'mail.archive':
          if (selectedId) runAction(selectedId, 'archive')
          break
        case 'mail.trash':
          if (selectedId) runAction(selectedId, 'trash')
          break
        case 'mail.spam':
          if (selectedId) runAction(selectedId, 'spam')
          break
        case 'mail.toggle-read':
          if (selectedMessage) {
            runAction(
              selectedMessage.id,
              selectedMessage.unread ? 'markRead' : 'markUnread',
            )
          }
          break
        case 'mail.toggle-star':
          if (selectedMessage) {
            runAction(
              selectedMessage.id,
              selectedMessage.starred ? 'unstar' : 'star',
            )
          }
          break
        case 'mail.toggle-important':
          if (selectedMessage) {
            runAction(
              selectedMessage.id,
              selectedMessage.important ? 'unimportant' : 'important',
            )
          }
          break
        case 'mail.add-label':
          if (selectedMessage) {
            window.dispatchEvent(new CustomEvent('mail:open-label-picker'))
          }
          break
        case 'mail.open-inbox':
          handleFolderChange('INBOX')
          break
        case 'mail.open-sent':
          handleFolderChange('SENT')
          break
        case 'mail.open-all':
          handleFolderChange('all')
          break
        case 'mail.open-spam':
          handleFolderChange('SPAM')
          break
        case 'mail.open-trash':
          handleFolderChange('TRASH')
          break
        case 'mail.open-drafts':
          handleFolderChange(DRAFT_FOLDER_ID)
          break
        case 'mail.open-snoozed':
          handleFolderChange('SNOOZED')
          break
      }
    }

    window.addEventListener('message', handleCommand)
    return () => window.removeEventListener('message', handleCommand)
  }, [
    dismissReader,
    closeReader,
    composer,
    draftClosePromptOpen,
    handleFolderChange,
    messageQuery.data,
    messagesQuery.refetch,
    openReply,
    runAction,
    selectedId,
    selectedMessage,
    showingDrafts,
  ])

  if (statusQuery.isLoading) {
    return (
      <main className="bg-background text-foreground flex min-h-screen items-center justify-center">
        <Loader2 className="text-muted-foreground size-5 animate-spin" />
      </main>
    )
  }

  if (!statusQuery.data?.authenticated) {
    return (
      <ConnectScreen
        error={statusQuery.error}
        onConnect={() => {
          void connectGmail()
        }}
      />
    )
  }

  const currentUnread = Boolean(
    messageQuery.data?.unread ?? selectedMessage?.unread,
  )
  const currentStarred = Boolean(
    messageQuery.data?.starred ?? selectedMessage?.starred,
  )
  const currentImportant = Boolean(
    messageQuery.data?.important ?? selectedMessage?.important,
  )
  const currentSpam = Boolean(
    (messageQuery.data ?? selectedMessage)?.labelIds.includes('SPAM'),
  )

  return (
    <main className="bg-background text-foreground flex h-screen min-h-0 flex-col overflow-hidden">
      {readerOpen ? (
        <EmailView
          message={messageQuery.data}
          fallback={selectedMessage}
          loading={messageQuery.isLoading}
          folderId={folderId}
          canGoPrevious={Boolean(previousMessage)}
          canGoNext={Boolean(nextMessage)}
          onBack={closeReader}
          closing={readerClosing}
          onPrevious={() =>
            previousMessage && replaceReaderMessage(previousMessage.id)
          }
          onNext={() => nextMessage && replaceReaderMessage(nextMessage.id)}
          onTrash={() => selectedId && runAction(selectedId, 'trash')}
          onToggleStar={() =>
            selectedMessage &&
            runAction(selectedMessage.id, currentStarred ? 'unstar' : 'star')
          }
          onToggleRead={() =>
            selectedMessage &&
            runAction(
              selectedMessage.id,
              currentUnread ? 'markRead' : 'markUnread',
            )
          }
          onMarkImportant={() =>
            selectedMessage &&
            runAction(
              selectedMessage.id,
              currentImportant ? 'unimportant' : 'important',
            )
          }
          onToggleSpam={() =>
            selectedMessage &&
            runAction(selectedMessage.id, currentSpam ? 'notSpam' : 'spam')
          }
        />
      ) : (
        <>
          <InboxHeader
            account={statusQuery.data.profile?.emailAddress ?? 'Gmail'}
            folderId={folderId}
            query={query}
            searchInput={searchInput}
            unreadCount={unreadCount}
            draftCount={drafts.length}
            snoozedCount={snoozedCount}
            refreshing={!showingDrafts && messagesQuery.isFetching}
            disconnecting={disconnectGmail.isPending}
            onCompose={() => setComposer(emptyComposer())}
            onDisconnect={handleDisconnect}
            onFolderChange={handleFolderChange}
            onRefresh={() => {
              if (!showingDrafts) void messagesQuery.refetch()
            }}
            onSearchInputChange={setSearchInput}
            onSearch={handleSearch}
            onClearSearch={clearSearch}
          />
          <div className="min-h-0 flex-1">
            <InboxView
              messages={messages}
              selectedId={selectedId}
              loading={
                showingDrafts ? draftsQuery.isLoading : messagesQuery.isLoading
              }
              error={showingDrafts ? draftsQuery.error : messagesQuery.error}
              folderId={folderId}
              query={query}
              account={statusQuery.data.profile?.emailAddress ?? null}
              unreadCount={unreadCount}
              actionError={
                actionMutation.error ??
                unsubscribeArchiveMutation.error ??
                updateLabelsMutation.error
              }
              onSelect={handleSelectMessage}
              onReply={handleReplyFromRow}
              onArchive={(id) => runAction(id, 'archive')}
              onUnsubscribeArchive={(id) =>
                unsubscribeArchiveMutation.mutate(id)
              }
              onSnooze={(id, until) => runAction(id, 'snooze', until)}
              onUnsnooze={(id) => runAction(id, 'unsnooze')}
              onSpam={(id) => runAction(id, 'spam')}
              selectedMessageIds={selectedBulkIds}
              selectionActive={bulkSelectionActive}
              onToggleMessageSelected={toggleBulkSelected}
            />
          </div>
        </>
      )}

      {readerOpen && selectedMessage && !readerClosing ? (
        <EmailActionDock
          onReply={() => messageQuery.data && openReply(messageQuery.data)}
          onArchive={() => {
            dismissReader()
            runAction(selectedMessage.id, 'archive')
          }}
          onSnooze={(until) => {
            dismissReader()
            runAction(selectedMessage.id, 'snooze', until)
          }}
          onUnsnooze={() => {
            dismissReader()
            runAction(selectedMessage.id, 'unsnooze')
          }}
          isSnoozed={selectedMessage.labelIds.includes('SNOOZED')}
          onTrash={() => {
            dismissReader()
            runAction(selectedMessage.id, 'trash')
          }}
          onSpam={() => {
            dismissReader()
            runAction(selectedMessage.id, 'spam')
          }}
        />
      ) : null}

      {!readerOpen && bulkSelectionActive ? (
        <BulkEmailActionDock
          selectedCount={selectedBulkIds.size}
          onClear={clearBulkSelection}
          onArchive={() => runBulkAction('archive')}
          onArchiveWithLabel={runBulkArchiveWithLabel}
          onSnooze={(until) => runBulkAction('snooze', until)}
          onSpam={() => runBulkAction('spam')}
          onTrash={() => runBulkAction('trash')}
        />
      ) : null}

      {composer ? (
        <Composer
          composer={composer}
          contacts={contactsQuery.data ?? []}
          error={sendMutation.error}
          sending={sendMutation.isPending}
          onChange={setComposer}
          onContactSearch={setContactSearch}
          onClose={handleComposerCloseRequest}
          onSubmit={handleSend}
        />
      ) : null}

      <AlertDialog
        open={draftClosePromptOpen}
        onOpenChange={setDraftClosePromptOpen}
      >
        <AlertDialogContent className="sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Save draft?</AlertDialogTitle>
            <AlertDialogDescription>
              Keep this message in Drafts or discard it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={handleDiscardDraftAndClose}
            >
              Discard
            </Button>
            <Button
              type="button"
              className="cursor-pointer"
              disabled={saveDraftMutation.isPending}
              onClick={handleSaveDraftAndClose}
            >
              Save
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}

interface InboxHeaderProps {
  account: string
  folderId: string
  query: string
  searchInput: string
  unreadCount: number
  draftCount: number
  snoozedCount: number
  refreshing: boolean
  disconnecting: boolean
  onCompose: () => void
  onDisconnect: () => void
  onFolderChange: (folderId: string) => void
  onRefresh: () => void
  onSearchInputChange: (value: string) => void
  onSearch: (event?: FormEvent) => void
  onClearSearch: () => void
}

function InboxHeader({
  account,
  folderId,
  query,
  searchInput,
  unreadCount,
  draftCount,
  snoozedCount,
  refreshing,
  disconnecting,
  onCompose,
  onDisconnect,
  onFolderChange,
  onRefresh,
  onSearchInputChange,
  onSearch,
  onClearSearch,
}: InboxHeaderProps) {
  return (
    <header className="shrink-0 px-5 pb-2 pt-5">
      <div className="mx-auto w-full max-w-[44rem]">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="emails-serif text-foreground text-[2rem] leading-none sm:text-[2.4rem]">
              Inbox
            </h1>
            <p className="text-muted-foreground mt-1.5 truncate text-xs">
              {account}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:bg-muted hover:text-foreground size-9 cursor-pointer rounded-full"
                  onClick={onRefresh}
                  aria-label="Refresh"
                >
                  <RefreshCcw
                    className={cn('size-4', refreshing && 'animate-spin')}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Refresh</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:bg-muted hover:text-foreground size-9 cursor-pointer rounded-full"
                  disabled={disconnecting}
                  onClick={onDisconnect}
                  aria-label="Disconnect Gmail"
                >
                  <LogOut className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Disconnect Gmail</p>
              </TooltipContent>
            </Tooltip>
            <Button
              type="button"
              size="sm"
              className="ml-1 h-9 cursor-pointer gap-1.5 rounded-full px-3.5 text-sm font-medium"
              onClick={onCompose}
            >
              <PenLine className="size-4" />
              <span className="hidden sm:inline">Compose</span>
            </Button>
          </div>
        </div>

        <form className="mt-5" onSubmit={onSearch}>
          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2" />
            <Input
              data-mail-search-input
              value={searchInput}
              onChange={(event) => onSearchInputChange(event.target.value)}
              placeholder="Search mail - from:, subject:, has:attachment"
              className={cn(
                'emails-search-input bg-muted/50 h-10 rounded-full border-transparent pl-10 pr-10 text-[13.5px]',
                'placeholder:text-muted-foreground/70',
              )}
            />
            {query || searchInput ? (
              <div className="text-muted-foreground/70 pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 text-[10.5px]">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="text-muted-foreground hover:bg-muted hover:text-foreground pointer-events-auto flex size-6 cursor-pointer items-center justify-center rounded-full"
                      onClick={onClearSearch}
                      aria-label="Clear search"
                    >
                      <X className="size-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Clear search</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            ) : null}
          </div>
        </form>

        <nav className="mt-4 flex gap-1 overflow-x-auto pb-1">
          {[
            folders[0],
            ...(snoozedCount > 0 || folderId === 'SNOOZED' ? [folders[1]] : []),
            ...(draftCount > 0
              ? [{ id: DRAFT_FOLDER_ID, label: 'Drafts', icon: FileText }]
              : []),
            ...folders.slice(2),
          ].map((folder) => {
            if (!folder) return null
            const Icon = folder.icon
            const active = folder.id === folderId

            return (
              <button
                key={folder.id}
                type="button"
                className={cn(
                  'flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium transition-colors',
                  active
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
                onClick={() => onFolderChange(folder.id)}
              >
                <Icon className="size-3.5" />
                <span>{folder.label}</span>
                {folder.id === 'INBOX' && unreadCount > 0 ? (
                  <span
                    className={cn(
                      'ml-0.5 rounded-full px-1.5 text-[10px] font-semibold tabular-nums',
                      active
                        ? 'bg-background/20 text-background'
                        : 'bg-muted text-foreground/90',
                    )}
                  >
                    {unreadCount}
                  </span>
                ) : null}
                {folder.id === DRAFT_FOLDER_ID && draftCount > 0 ? (
                  <span
                    className={cn(
                      'ml-0.5 rounded-full px-1.5 text-[10px] font-semibold tabular-nums',
                      active
                        ? 'bg-background/20 text-background'
                        : 'bg-muted text-foreground/90',
                    )}
                  >
                    {draftCount}
                  </span>
                ) : null}
                {folder.id === 'SNOOZED' && snoozedCount > 0 ? (
                  <span
                    className={cn(
                      'ml-0.5 rounded-full px-1.5 text-[10px] font-semibold tabular-nums',
                      active
                        ? 'bg-background/20 text-background'
                        : 'bg-muted text-foreground/90',
                    )}
                  >
                    {snoozedCount}
                  </span>
                ) : null}
              </button>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
