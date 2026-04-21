'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AppWindow,
  ArrowUp,
  Ban,
  Binary,
  Copy,
  FolderGit,
  FolderOpen,
  GitBranch,
  GitCommit,
  GitPullRequest,
  History,
  LayoutList,
  MessageSquare,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Terminal,
  Wrench,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Separator,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  sendToMoldable,
  useWorkspace,
} from '@moldable-ai/ui'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatDistanceToNow } from 'date-fns'

interface GitFile {
  path: string
  index: string
  working_dir: string
}

interface RecentRepo {
  name: string
  path: string
  isDirty?: boolean
}

interface GitData {
  currentBranch: string
  repoName: string
  repoPath: string
  files: GitFile[]
  recentRepos: RecentRepo[]
  branches: string[]
  isClean?: boolean
}

interface DetectedEditor {
  id: string
  name: string
  appName: string
  appPath: string
  iconPath?: string
}

interface LogEntry {
  hash: string
  date: string
  message: string
  author_name: string
  author_email: string
  isUnpushed?: boolean
}

interface CommitInput {
  summary: string
  description: string
}

interface GeneratedCommitMessage {
  summary: string
  description?: string
}

interface CodeReviewFinding {
  severity?: string
  file?: string
  title?: string
  details?: string
  suggestion?: string
}

interface CodeReviewResult {
  summary: string
  findings: CodeReviewFinding[]
}

function getAppMonogram(name: string) {
  const letters = name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return letters || name.slice(0, 2).toUpperCase()
}

function AppIcon({ editor }: { editor?: DetectedEditor | null }) {
  const [failed, setFailed] = useState(false)

  if (editor?.id && !failed) {
    return (
      <img
        src={`/api/git?editorIcon=${encodeURIComponent(editor.id)}`}
        alt=""
        className="size-4 rounded-sm object-contain"
        onError={() => setFailed(true)}
      />
    )
  }

  if (editor?.name === 'Xcode') {
    return <Wrench className="size-4" />
  }

  return (
    <span className="text-[10px] font-black tracking-tight">
      {getAppMonogram(editor?.name ?? 'App')}
    </span>
  )
}

export default function GitFlowPage() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [selectedCommit, setSelectedCommit] = useState<string | null>(null)
  const [view, setView] = useState<'changes' | 'history'>('changes')
  const [error, setError] = useState<string | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())

  const [summary, setSummary] = useState('')
  const [description, setDescription] = useState('')
  const [codeReview, setCodeReview] = useState<CodeReviewResult | null>(null)
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [chatActionFeedback, setChatActionFeedback] = useState<string | null>(
    null,
  )
  const [dismissedFindingKeys, setDismissedFindingKeys] = useState<Set<string>>(
    new Set(),
  )
  const [isHandingOffToChat, setIsHandingOffToChat] = useState(false)
  const [fileFilter, setFileFilter] = useState('')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [preferredEditorId, setPreferredEditorId] = useState<string | null>(
    null,
  )
  const fileFilterInputRef = useRef<HTMLInputElement | null>(null)

  // Query for Git data (status, branches, etc)
  const {
    data,
    isLoading: loading,
    refetch: fetchData,
  } = useQuery<GitData>({
    queryKey: ['git-status', workspaceId],
    queryFn: async () => {
      const res = await fetchWithWorkspace('/api/git')
      if (!res.ok) throw new Error('Failed to fetch git data')
      const json = await res.json()
      return json
    },
    refetchInterval: 5000, // Auto-refresh every 5 seconds
    refetchOnWindowFocus: true, // Refresh when the app is focused
  })

  // Query for Log History
  const { data: history } = useQuery<LogEntry[]>({
    queryKey: ['git-history', workspaceId, data?.repoPath],
    queryFn: async () => {
      const res = await fetchWithWorkspace('/api/git?history')
      if (!res.ok) throw new Error('Failed to fetch history')
      const json = await res.json()
      return json.history
    },
    enabled: !!data?.repoPath, // Enable even when not in history view to show pending last commit
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  })

  const { data: editors = [] } = useQuery<DetectedEditor[]>({
    queryKey: ['git-editors', workspaceId],
    queryFn: async () => {
      const res = await fetchWithWorkspace('/api/git?editors=1')
      if (!res.ok) throw new Error('Failed to fetch editors')
      const json = await res.json()
      return json.editors ?? []
    },
    staleTime: 60_000,
  })

  // Query for File Diff
  const { data: fileDiff, isLoading: loadingDiff } = useQuery<string | null>({
    queryKey: ['git-diff', workspaceId, selectedFile, selectedCommit],
    queryFn: async () => {
      if (selectedCommit) {
        const res = await fetchWithWorkspace(`/api/git?hash=${selectedCommit}`)
        if (!res.ok) throw new Error('Failed to fetch commit diff')
        const json = await res.json()
        return json.diff || null
      }

      if (!selectedFile) return null
      const res = await fetchWithWorkspace(
        `/api/git?file=${encodeURIComponent(selectedFile)}`,
      )
      if (!res.ok) throw new Error('Failed to fetch diff')
      const json = await res.json()
      return json.diff || null
    },
    enabled: !!selectedFile || !!selectedCommit,
  })

  // Mutation for generating a commit message from selected diffs
  const generateCommitMessageMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchWithWorkspace('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generateCommitMessage',
          paths: Array.from(selectedFiles),
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Failed to generate commit message')
      }
      return json as GeneratedCommitMessage
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  // Mutation for reviewing selected changes
  const reviewCodeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchWithWorkspace('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reviewCode',
          paths: Array.from(selectedFiles),
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Failed to review code')
      }
      return json as CodeReviewResult
    },
    onSuccess: (review) => {
      setDismissedFindingKeys(new Set())
      setCodeReview(review)
      setIsReviewModalOpen(true)
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  // Mutation for Committing
  const commitMutation = useMutation({
    mutationFn: async (input: CommitInput) => {
      const res = await fetchWithWorkspace('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'commit',
          paths: Array.from(selectedFiles),
          summary: input.summary,
          description: input.description,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Commit failed')
      return json
    },
    onSuccess: () => {
      setSummary('')
      setDescription('')
      setSelectedFiles(new Set())
      setSelectedFile(null)
      setSelectedCommit(null)
      queryClient.invalidateQueries({ queryKey: ['git-status', workspaceId] })
      queryClient.invalidateQueries({ queryKey: ['git-history', workspaceId] })
    },
    onSettled: () => {
      // Ensure we refresh status regardless of success/error
      queryClient.invalidateQueries({ queryKey: ['git-status', workspaceId] })
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  // Mutation for Pushing
  const pushMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchWithWorkspace('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'push' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Push failed')
      return json
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['git-status', workspaceId] })
      queryClient.invalidateQueries({ queryKey: ['git-history', workspaceId] })
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  // Mutation for Undoing Commit
  const undoMutation = useMutation({
    mutationFn: async (commit: LogEntry) => {
      const res = await fetchWithWorkspace('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'undo', hash: commit.hash }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Undo failed')
      return { json, commit }
    },
    onSuccess: ({ commit }) => {
      setView('changes')
      setSelectedCommit(null)

      // Restore summary and description
      setSummary(commit.message)
      // Note: Full description isn't in simple log message usually,
      // but we restore what we have from the message.

      queryClient
        .invalidateQueries({ queryKey: ['git-status', workspaceId] })
        .then(() => {
          // After status refreshes, select all files
          const status = queryClient.getQueryData<GitData>([
            'git-status',
            workspaceId,
          ])
          if (status?.files) {
            setSelectedFiles(new Set(status.files.map((f) => f.path)))
          }
        })
      queryClient.invalidateQueries({ queryKey: ['git-history', workspaceId] })
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  // Mutation for changing repo
  const repoMutation = useMutation({
    mutationFn: async (repoPath: string) => {
      const res = await fetchWithWorkspace('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: repoPath }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to change repo')
      return json
    },
    onSuccess: (json: GitData) => {
      queryClient.setQueryData<GitData>(
        ['git-status', workspaceId],
        (previous) => ({
          ...json,
          recentRepos: json.recentRepos ?? previous?.recentRepos ?? [],
        }),
      )
      const firstFile = json.files?.[0]?.path || null
      setSelectedFile(firstFile)
      if (json.files) {
        setSelectedFiles(new Set(json.files.map((f: GitFile) => f.path)))
      }
      queryClient.invalidateQueries({ queryKey: ['git-history', workspaceId] })
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  const filteredFiles = useMemo(() => {
    const files = data?.files ?? []
    const filter = fileFilter.trim().toLowerCase()

    if (!filter) return files

    return files.filter((file) => file.path.toLowerCase().includes(filter))
  }, [data?.files, fileFilter])

  const visibleChangedFileCount = filteredFiles.length

  const selectRelativeFile = useCallback(
    (direction: -1 | 1) => {
      if (view !== 'changes' || filteredFiles.length === 0) return

      const currentIndex = filteredFiles.findIndex(
        (file) => file.path === selectedFile,
      )
      const fallbackIndex = direction > 0 ? -1 : 0
      const startIndex = currentIndex >= 0 ? currentIndex : fallbackIndex
      const nextIndex = Math.min(
        filteredFiles.length - 1,
        Math.max(0, startIndex + direction),
      )

      setSelectedCommit(null)
      setSelectedFile(filteredFiles[nextIndex]?.path ?? null)
    },
    [filteredFiles, selectedFile, view],
  )

  const handleOpenFileInEditor = async (filePath: string) => {
    try {
      setError(null)
      const res = await fetchWithWorkspace('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'openInEditor',
          path: filePath,
          editorId: preferredEditorId,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Failed to open file')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open file')
    }
  }

  // Auto-select first file on initial load
  useEffect(() => {
    if (data?.files && data.files.length > 0 && !selectedFile) {
      setSelectedFile(data.files[0].path)
      setSelectedFiles(new Set(data.files.map((f: GitFile) => f.path)))
    }
  }, [data, selectedFile])

  useEffect(() => {
    if (!preferredEditorId && editors.length > 0) {
      setPreferredEditorId(editors[0].id)
    }
  }, [editors, preferredEditorId])

  useEffect(() => {
    if (!isFilterOpen) return
    fileFilterInputRef.current?.focus()
  }, [isFilterOpen])

  useEffect(() => {
    if (view !== 'changes' || filteredFiles.length === 0) return
    if (
      selectedFile &&
      filteredFiles.some((file) => file.path === selectedFile)
    ) {
      return
    }

    setSelectedFile(filteredFiles[0]?.path ?? null)
  }, [filteredFiles, selectedFile, view])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const tagName = target?.tagName?.toLowerCase()
      const isTypingTarget =
        tagName === 'input' ||
        tagName === 'textarea' ||
        target?.isContentEditable === true

      if (isTypingTarget || view !== 'changes') return
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return

      event.preventDefault()
      selectRelativeFile(event.key === 'ArrowDown' ? 1 : -1)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectRelativeFile, view])

  const handleFileSelect = (filePath: string) => {
    setSelectedCommit(null)
    setSelectedFile(filePath)
  }

  const handleCommitSelect = (hash: string) => {
    setSelectedFile(null)
    setSelectedCommit(hash)
  }

  const handleChangesTabSelect = () => {
    setView('changes')
    setSelectedCommit(null)
    setSelectedFile(filteredFiles[0]?.path ?? data?.files?.[0]?.path ?? null)
  }

  const handleHistoryTabSelect = () => {
    setView('history')
    setSelectedFile(null)
    setSelectedCommit(history?.[0]?.hash ?? null)
  }

  const handleCommit = async () => {
    if (selectedFiles.size === 0) {
      setError('Please select at least one file to commit.')
      return
    }
    setError(null)
    generateCommitMessageMutation.reset()
    reviewCodeMutation.reset()
    commitMutation.reset()

    let commitSummary = summary.trim()
    let commitDescription = description.trim()

    if (!commitSummary) {
      try {
        const generated = await generateCommitMessageMutation.mutateAsync()
        commitSummary = generated.summary.trim()
        commitDescription = generated.description?.trim() ?? ''
        setSummary(commitSummary)
        setDescription(commitDescription)
      } catch {
        return
      }
    }

    commitMutation.mutate({
      summary: commitSummary,
      description: commitDescription,
    })
  }

  const copyError = () => {
    if (error) {
      navigator.clipboard.writeText(error)
    }
  }

  const copyCommitHash = () => {
    if (selectedCommit) {
      navigator.clipboard.writeText(selectedCommit)
    }
  }

  const buildReviewPrompt = (findings?: CodeReviewFinding[]) => {
    if (!codeReview) return ''

    const selectedPaths = Array.from(selectedFiles)
    const reviewFindings = findings ?? codeReview.findings

    return [
      `Help me fix code review feedback in the Git app at ${data?.repoPath ?? 'the current repository'}.`,
      '',
      `Selected files (${selectedPaths.length}):`,
      selectedPaths.length > 0
        ? selectedPaths.map((path) => `- ${path}`).join('\n')
        : '- No specific files selected',
      '',
      'Review summary:',
      codeReview.summary,
      '',
      'Review findings:',
      reviewFindings.length > 0
        ? reviewFindings
            .map((finding, index) => {
              return [
                `${index + 1}. ${finding.title ?? 'Review finding'}`,
                finding.severity ? `Severity: ${finding.severity}` : null,
                finding.file ? `File: ${finding.file}` : null,
                finding.details ? `Details: ${finding.details}` : null,
                finding.suggestion
                  ? `Suggested fix: ${finding.suggestion}`
                  : null,
              ]
                .filter(Boolean)
                .join('\n')
            })
            .join('\n\n')
        : '- No findings, but please review the summary and suggest any worthwhile fixes.',
      '',
      'Please make the necessary code changes directly in this app.',
    ].join('\n')
  }

  const loadReviewIntoChat = (findings?: CodeReviewFinding[]) => {
    const prompt = buildReviewPrompt(findings)
    if (!prompt) return

    try {
      setIsHandingOffToChat(true)
      setChatActionFeedback(null)

      sendToMoldable({
        type: 'moldable:set-chat-instructions',
        text: `The user is working in the Git app at ${data?.repoPath ?? 'the current repository'}. They want help addressing code review feedback. Use the repository and findings below as the active task context.\n\n${prompt}`,
      })
      window.parent.postMessage(
        { type: 'moldable:set-chat-input', text: prompt },
        '*',
      )

      window.setTimeout(() => {
        setIsHandingOffToChat(false)
        setChatActionFeedback('Loaded review details into chat.')
        window.setTimeout(() => setChatActionFeedback(null), 4000)
      }, 600)
    } catch {
      setIsHandingOffToChat(false)
      setChatActionFeedback('Could not load review details into chat.')
      window.setTimeout(() => setChatActionFeedback(null), 4000)
    }
  }

  const getFindingKey = (finding: CodeReviewFinding, index: number) => {
    return `${finding.file ?? 'finding'}::${finding.title ?? 'untitled'}::${index}`
  }

  const dismissFinding = (finding: CodeReviewFinding, index: number) => {
    const key = getFindingKey(finding, index)
    setDismissedFindingKeys((previous) => new Set(previous).add(key))
  }

  const copyFinding = async (finding: CodeReviewFinding, index: number) => {
    const findingText = [
      `${index + 1}. ${finding.title ?? 'Review finding'}`,
      finding.severity ? `Severity: ${finding.severity}` : null,
      finding.file ? `File: ${finding.file}` : null,
      finding.details ? `Details: ${finding.details}` : null,
      finding.suggestion ? `Suggested fix: ${finding.suggestion}` : null,
    ]
      .filter(Boolean)
      .join('\n')

    await navigator.clipboard.writeText(findingText)
  }

  const copyAllReview = async () => {
    if (!codeReview) return

    const reviewText = [
      'Code Review',
      '',
      'Review summary:',
      codeReview.summary,
      '',
      'Review findings:',
      visibleFindings.length > 0
        ? visibleFindings
            .map(({ finding, originalIndex }) => {
              return [
                `${originalIndex + 1}. ${finding.title ?? 'Review finding'}`,
                finding.severity ? `Severity: ${finding.severity}` : null,
                finding.file ? `File: ${finding.file}` : null,
                finding.details ? `Details: ${finding.details}` : null,
                finding.suggestion
                  ? `Suggested fix: ${finding.suggestion}`
                  : null,
              ]
                .filter(Boolean)
                .join('\n')
            })
            .join('\n\n')
        : 'No review items remaining',
    ].join('\n')

    try {
      await navigator.clipboard.writeText(reviewText)
      setChatActionFeedback('Copied review details.')
      window.setTimeout(() => setChatActionFeedback(null), 4000)
    } catch {
      setChatActionFeedback('Could not copy review details.')
      window.setTimeout(() => setChatActionFeedback(null), 4000)
    }
  }

  const toggleFile = (path: string) => {
    const newSelected = new Set(selectedFiles)
    if (newSelected.has(path)) {
      newSelected.delete(path)
    } else {
      newSelected.add(path)
    }
    setCodeReview(null)
    setSelectedFiles(newSelected)
  }

  const handleSelectAll = (checked: boolean) => {
    setCodeReview(null)
    if (checked && data?.files) {
      setSelectedFiles(new Set(data.files.map((f) => f.path)))
    } else {
      setSelectedFiles(new Set())
    }
  }

  const handleRepoChange = (repoPath: string) => {
    setError(null)
    setCodeReview(null)
    repoMutation.mutate(repoPath)
  }

  const handleReviewCode = () => {
    if (selectedFiles.size === 0) {
      setError('Please select at least one file to review.')
      return
    }
    setError(null)
    reviewCodeMutation.mutate()
  }

  const selectedApp =
    editors.find((editor) => editor.id === preferredEditorId) ??
    editors[0] ??
    null

  const handlePickFolder = async () => {
    try {
      const selected = await new Promise<string | null>((resolve) => {
        const requestId = crypto.randomUUID()

        const handler = (event: MessageEvent) => {
          if (
            event.data?.type === 'moldable:folder-selected' &&
            event.data?.requestId === requestId
          ) {
            window.removeEventListener('message', handler)
            resolve(event.data.path ?? null)
          }
        }

        window.addEventListener('message', handler)
        sendToMoldable({
          type: 'moldable:select-folder',
          requestId,
          title: 'Select Git Repository',
        })

        window.setTimeout(() => {
          window.removeEventListener('message', handler)
          resolve(null)
        }, 60000)
      })

      if (selected) {
        handleRepoChange(selected)
      }
    } catch {
      setError('Failed to open folder picker.')
    }
  }

  const hasUnpushedCommits =
    history?.some((commit) => commit.isUnpushed) ?? false
  const changedFileCount = data?.files?.length ?? 0
  const hasChangedFiles = changedFileCount > 0
  const hasVisibleChangedFiles = visibleChangedFileCount > 0
  const latestCommit = history?.[0]
  const canUndoSelectedCommit =
    !!selectedCommit &&
    latestCommit?.hash === selectedCommit &&
    latestCommit.isUnpushed === true

  const visibleFindings = codeReview
    ? codeReview.findings
        .map((finding, index) => ({ finding, originalIndex: index }))
        .filter(
          ({ finding, originalIndex }) =>
            !dismissedFindingKeys.has(getFindingKey(finding, originalIndex)),
        )
    : []

  const errorTitle = (() => {
    if (generateCommitMessageMutation.isError) return 'Generation Failed'
    if (reviewCodeMutation.isError) return 'Review Failed'
    if (commitMutation.isError) return 'Commit Failed'
    if (pushMutation.isError) return 'Push Failed'
    if (undoMutation.isError) return 'Undo Failed'
    if (repoMutation.isError) return 'Repository Failed'
    return 'Action Failed'
  })()

  if (loading && !data) {
    return (
      <div className="bg-background flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="text-primary/40 size-8 animate-spin" />
          <p className="text-muted-foreground animate-pulse text-sm font-medium tracking-tight">
            Accessing Git Repository...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-background text-foreground flex h-screen flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-muted/30 flex h-12 shrink-0 items-center justify-between border-b px-4 backdrop-blur-md">
        <div className="flex items-center gap-4 md:gap-6">
          <div className="flex items-center gap-2">
            <Select value={data?.repoPath} onValueChange={handleRepoChange}>
              <SelectTrigger className="hover:bg-muted/50 h-10 min-w-[200px] max-w-[320px] border-none bg-transparent shadow-none transition-colors">
                <div className="flex flex-col items-start gap-0">
                  <span className="text-muted-foreground group-hover:text-foreground text-[10px] font-medium uppercase leading-none tracking-tight">
                    Current Repository
                  </span>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <FolderGit className="text-foreground size-3.5 shrink-0" />
                    <span className="text-foreground text-sm font-bold leading-none">
                      {data?.repoName || data?.repoPath?.split('/').pop()}
                    </span>
                    {data?.isClean === false ? (
                      <span
                        className="bg-primary inline-block size-2 rounded-full"
                        aria-label="Repository has uncommitted changes"
                        title="Repository has uncommitted changes"
                      />
                    ) : null}
                  </div>
                </div>
              </SelectTrigger>
              <SelectContent>
                <div className="bg-muted/10 border-b p-1">
                  <button
                    onClick={handlePickFolder}
                    className="text-muted-foreground hover:bg-accent hover:text-foreground flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[11px] font-bold transition-colors"
                  >
                    <FolderOpen className="size-3.5" />
                    Open Local Repository...
                  </button>
                </div>
                {data?.recentRepos?.map((repo) => (
                  <SelectItem key={repo.path} value={repo.path}>
                    <div className="flex flex-col items-start gap-0.5 py-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold leading-none">
                          {repo.name}
                        </span>
                        {repo.isDirty ? (
                          <span
                            className="bg-primary inline-block size-2 rounded-full"
                            aria-label={`${repo.name} has uncommitted changes`}
                            title="Repository has uncommitted changes"
                          />
                        ) : null}
                      </div>
                      <span className="text-muted-foreground max-w-[220px] truncate font-mono text-[9.5px] opacity-60">
                        {repo.path}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-border/60 h-4 w-px" />

          {/* Branch Selector */}
          <div className="flex items-center gap-2">
            <Select value={data?.currentBranch} onValueChange={() => {}}>
              <SelectTrigger className="bg-background/50 hover:bg-accent h-8 w-[160px] border-none font-medium shadow-none transition-colors">
                <div className="flex items-center gap-2">
                  <GitBranch className="text-muted-foreground size-3.5" />
                  <SelectValue placeholder="Select branch" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {data?.branches?.map((branch: string) => (
                  <SelectItem key={branch} value={branch}>
                    {branch}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {editors.length > 0 && (
            <div className="flex items-center gap-2">
              <Select
                value={preferredEditorId ?? editors[0]?.id}
                onValueChange={setPreferredEditorId}
              >
                <SelectTrigger className="hover:bg-muted/50 border-border/60 bg-background/80 h-10 min-w-[180px] max-w-[220px] rounded-xl border px-2.5 shadow-sm transition-colors">
                  <div className="flex min-w-0 items-center gap-2 pr-2">
                    <div className="bg-muted text-foreground border-border/50 flex size-7 shrink-0 items-center justify-center rounded-lg border shadow-sm">
                      {selectedApp ? (
                        <AppIcon editor={selectedApp} />
                      ) : (
                        <AppWindow className="size-4" />
                      )}
                    </div>
                    <div className="min-w-0 text-left">
                      <div className="text-muted-foreground text-[10px] font-medium uppercase leading-none tracking-tight">
                        Editor
                      </div>
                      <div className="text-foreground truncate text-sm font-bold leading-none">
                        {selectedApp?.name ?? 'Choose editor'}
                      </div>
                    </div>
                  </div>
                </SelectTrigger>
                <SelectContent className="w-[260px] rounded-2xl p-1.5 shadow-xl">
                  {editors.map((editor) => (
                    <SelectItem
                      key={editor.id}
                      value={editor.id}
                      className="rounded-xl px-2 py-2 pr-8"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="bg-muted text-foreground border-border/50 flex size-8 shrink-0 items-center justify-center rounded-lg border shadow-sm">
                          <AppIcon editor={editor} />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">
                            {editor.name}
                          </div>
                          <div className="text-muted-foreground truncate text-[11px]">
                            {editor.appPath.split('/').slice(-2).join('/')}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => pushMutation.mutate()}
            disabled={pushMutation.isPending || !hasUnpushedCommits}
            title={hasUnpushedCommits ? 'Push to Remote' : 'No commits to push'}
            className="hover:bg-primary/10 text-primary flex h-8 cursor-pointer items-center gap-2 rounded-md px-3 text-xs font-bold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pushMutation.isPending ? (
              <RefreshCw className="size-3.5 animate-spin" />
            ) : (
              <ArrowUp className="size-3.5" />
            )}
            Push
          </button>
          <div className="bg-border/60 h-4 w-px" />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => fetchData()}
                  className="hover:bg-accent text-muted-foreground flex size-8 cursor-pointer items-center justify-center rounded-md transition-all active:scale-95"
                  aria-label="Refresh status"
                >
                  <RefreshCw
                    className={cn(
                      'size-4',
                      loading && 'text-primary animate-spin',
                    )}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Refresh status</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </header>

      <div className="relative flex flex-1 overflow-hidden">
        {/* Commit Hook Error HUD */}
        {error && (
          <>
            <div
              className="bg-background/20 animate-in fade-in pointer-events-auto absolute inset-0 z-40 cursor-pointer backdrop-blur-[2px] duration-300"
              onClick={() => setError(null)}
            />
            <div className="pointer-events-none absolute inset-x-0 top-[15%] z-50 flex justify-center px-4">
              <div className="border-destructive/30 bg-background/95 animate-in fade-in slide-in-from-top-4 pointer-events-auto flex w-full max-w-2xl flex-col overflow-hidden rounded-lg border shadow-2xl duration-300">
                <div className="border-destructive/20 bg-destructive/10 text-destructive flex items-center justify-between border-b px-3 py-2">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
                    <Terminal className="size-3.5" />
                    {errorTitle}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={copyError}
                      className="bg-destructive/10 hover:bg-destructive/20 border-destructive/20 flex cursor-pointer items-center gap-1.5 rounded border px-2 py-0.5 text-[10px] font-bold transition-colors active:scale-95"
                    >
                      <Copy className="size-3" />
                      Copy Error
                    </button>
                    <button
                      onClick={() => setError(null)}
                      className="hover:bg-destructive/10 cursor-pointer rounded p-1 transition-colors active:scale-95"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                </div>
                <div className="custom-scrollbar max-h-[300px] overflow-auto bg-zinc-950 p-4 font-mono text-[11px] leading-relaxed text-red-400">
                  <pre className="whitespace-pre-wrap">{error}</pre>
                </div>
                <div className="bg-muted/30 text-muted-foreground flex items-center gap-1.5 px-3 py-2 text-[10px] italic">
                  <ShieldAlert className="size-3" />
                  Fix the issues and try again.
                </div>
              </div>
            </div>
          </>
        )}

        {/* Code Review Modal */}
        {isReviewModalOpen && codeReview && (
          <>
            <div
              className="bg-background/50 animate-in fade-in absolute inset-0 z-40 cursor-pointer backdrop-blur-sm duration-200"
              onClick={() => setIsReviewModalOpen(false)}
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-[var(--chat-safe-padding)] top-0 z-50 flex min-h-0 items-center justify-center p-4 md:p-8">
              <div className="bg-background pointer-events-auto flex h-[min(calc(85vh-var(--chat-safe-padding)),900px)] max-h-full min-h-0 w-full max-w-4xl flex-col overflow-hidden rounded-xl border shadow-2xl">
                <div className="bg-muted/30 flex items-start justify-between gap-4 border-b px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="text-primary size-4" />
                      <h2 className="text-sm font-bold tracking-tight">
                        Code Review
                      </h2>
                      {visibleFindings.length > 0 && (
                        <span className="text-muted-foreground text-[11px]">
                          {visibleFindings.length}{' '}
                          {visibleFindings.length === 1
                            ? 'finding'
                            : 'findings'}
                        </span>
                      )}
                    </div>
                    {visibleFindings.length > 0 && (
                      <p className="text-muted-foreground mt-1 max-w-3xl text-xs leading-relaxed">
                        {codeReview.summary}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => setIsReviewModalOpen(false)}
                      className="hover:bg-accent cursor-pointer rounded-md p-2 transition-colors active:scale-95"
                      aria-label="Close code review"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>

                {chatActionFeedback && (
                  <div className="bg-primary/10 text-primary border-b px-4 py-2 text-[11px] font-medium">
                    {chatActionFeedback}
                  </div>
                )}

                <div className="relative min-h-0 flex-1">
                  {(reviewCodeMutation.isPending || isHandingOffToChat) && (
                    <div className="bg-background/75 absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 backdrop-blur-[2px]">
                      <RefreshCw className="text-primary size-6 animate-spin" />
                      <div className="space-y-1 text-center">
                        <p className="text-sm font-semibold">
                          {isHandingOffToChat
                            ? 'Handing off to chat…'
                            : 'Verifying fixes…'}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {isHandingOffToChat
                            ? 'Keeping this review open so you can verify fixes after.'
                            : 'Re-running code review on the current changes.'}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="custom-scrollbar h-full overflow-y-auto p-4 md:p-5">
                    {visibleFindings.length === 0 ? (
                      <div className="text-muted-foreground flex h-full min-h-[240px] flex-col items-center justify-center gap-3 text-center">
                        <ShieldAlert className="size-8 opacity-40" />
                        <p className="text-foreground text-sm font-semibold">
                          No review items remaining
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {visibleFindings.map(({ finding, originalIndex }) => (
                          <div
                            key={`${finding.file ?? 'finding'}-${originalIndex}`}
                            className="bg-card rounded-lg border p-4 shadow-sm"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="text-sm font-semibold tracking-tight">
                                    {finding.title ??
                                      `Finding ${originalIndex + 1}`}
                                  </h3>
                                  <span className="bg-muted text-muted-foreground rounded px-2 py-0.5 text-[10px] font-bold uppercase">
                                    {finding.severity ?? 'note'}
                                  </span>
                                </div>
                                {finding.file && (
                                  <p className="text-muted-foreground mt-1 break-all font-mono text-[11px]">
                                    {finding.file}
                                  </p>
                                )}
                              </div>
                              <TooltipProvider>
                                <div className="flex shrink-0 items-center gap-2">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={() =>
                                          copyFinding(finding, originalIndex)
                                        }
                                        className="border-border bg-background hover:bg-accent cursor-pointer rounded-md border p-2 transition-all active:scale-95"
                                        aria-label="Copy finding"
                                      >
                                        <Copy className="size-3.5" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                      <p>Copy finding</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  <button
                                    onClick={() =>
                                      loadReviewIntoChat([finding])
                                    }
                                    className="border-border bg-background hover:bg-accent flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-2 text-[11px] font-bold transition-all active:scale-95"
                                  >
                                    <MessageSquare className="size-3.5" />
                                    Fix in chat
                                  </button>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={() =>
                                          dismissFinding(finding, originalIndex)
                                        }
                                        className="border-border bg-background hover:bg-accent cursor-pointer rounded-md border p-2 transition-all active:scale-95"
                                        aria-label="Dismiss finding"
                                      >
                                        <Ban className="size-3.5" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                      <p>Dismiss finding</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </TooltipProvider>
                            </div>

                            {finding.details && (
                              <div className="mt-3">
                                <p className="text-foreground/70 text-[11px] font-bold uppercase tracking-wider">
                                  Details
                                </p>
                                <p className="text-foreground/85 mt-1 text-sm leading-relaxed">
                                  {finding.details}
                                </p>
                              </div>
                            )}

                            {finding.suggestion && (
                              <div className="bg-muted/40 mt-3 rounded-md border p-3">
                                <p className="text-foreground/70 text-[11px] font-bold uppercase tracking-wider">
                                  Suggested fix
                                </p>
                                <p className="text-foreground/85 mt-1 text-sm leading-relaxed">
                                  {finding.suggestion}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-muted/20 flex items-center justify-between gap-3 border-t px-4 py-3">
                  <div className="flex items-center gap-2">
                    {visibleFindings.length > 0 && (
                      <>
                        <button
                          onClick={copyAllReview}
                          className="border-border bg-background hover:bg-accent flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-2 text-[11px] font-bold transition-all active:scale-95"
                        >
                          <Copy className="size-3.5" />
                          Copy all
                        </button>
                        <button
                          onClick={() => loadReviewIntoChat()}
                          disabled={isHandingOffToChat}
                          className="border-border bg-background hover:bg-accent flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-2 text-[11px] font-bold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <MessageSquare className="size-3.5" />
                          Fix all in chat
                        </button>
                        <button
                          onClick={handleReviewCode}
                          disabled={reviewCodeMutation.isPending}
                          className="border-border bg-background hover:bg-accent flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-2 text-[11px] font-bold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {reviewCodeMutation.isPending ? (
                            <>
                              <RefreshCw className="size-3.5 animate-spin" />
                              Re-running review...
                            </>
                          ) : (
                            <>
                              <ShieldAlert className="size-3.5" />
                              Re-run code review
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Separator orientation="vertical" className="h-6" />
                    <button
                      onClick={() => setIsReviewModalOpen(false)}
                      className="border-border bg-background hover:bg-accent cursor-pointer rounded-md border px-3 py-2 text-[11px] font-bold transition-all active:scale-95"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Sidebar */}
        <aside className="bg-muted/5 flex w-72 shrink-0 flex-col border-r">
          <div className="flex h-10 shrink-0 items-center border-b px-2">
            <button
              onClick={handleChangesTabSelect}
              className={cn(
                'flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-sm py-1.5 text-[11px] font-bold transition-all',
                view === 'changes'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent/50',
              )}
            >
              <LayoutList className="size-3" />
              Changes
            </button>
            <div className="bg-border/60 mx-1 h-4 w-px shrink-0 self-center rounded-full" />
            <button
              onClick={handleHistoryTabSelect}
              className={cn(
                'flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-sm py-1.5 text-[11px] font-bold transition-all',
                view === 'history'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent/50',
              )}
            >
              <History className="size-3" />
              History
            </button>
          </div>

          {view === 'changes' ? (
            <>
              <div className="bg-muted/10 flex shrink-0 items-center justify-between gap-2 border-b p-3.5">
                {isFilterOpen ? (
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <Search className="text-muted-foreground size-3.5 shrink-0" />
                    <input
                      ref={fileFilterInputRef}
                      value={fileFilter}
                      onChange={(e) => setFileFilter(e.target.value)}
                      placeholder="Filter changed files"
                      className="bg-background focus:ring-primary h-8 min-w-0 flex-1 rounded-md border px-2.5 text-xs outline-none focus:ring-1"
                    />
                    <button
                      onClick={() => {
                        setFileFilter('')
                        setIsFilterOpen(false)
                      }}
                      className="text-muted-foreground hover:bg-accent hover:text-foreground flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors"
                      aria-label="Close file filter"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex min-w-0 items-center gap-2">
                      <Checkbox
                        id="select-all"
                        checked={
                          hasChangedFiles &&
                          selectedFiles.size === changedFileCount
                        }
                        onCheckedChange={(checked) =>
                          handleSelectAll(checked === true)
                        }
                      />
                      <h2 className="text-foreground text-[12px] font-semibold">
                        {changedFileCount} changed{' '}
                        {changedFileCount === 1 ? 'file' : 'files'}
                      </h2>
                    </div>
                    <button
                      onClick={() => setIsFilterOpen(true)}
                      className="text-muted-foreground hover:bg-accent hover:text-foreground flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors"
                      aria-label="Filter changed files"
                      title="Filter changed files"
                    >
                      <Search className="size-3.5" />
                    </button>
                  </>
                )}
              </div>

              <div className="flex min-h-0 flex-1 flex-col">
                <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-2">
                  {!hasChangedFiles ? (
                    <div className="-mt-8 flex h-full flex-col items-center justify-center opacity-40 grayscale">
                      <div className="border-muted mb-3 flex size-12 items-center justify-center rounded-full border-2 border-dashed">
                        <GitCommit className="size-6" />
                      </div>
                      <p className="text-xs font-semibold">Workspace clean</p>
                      <p className="mt-1 px-6 text-center text-[10px] opacity-70">
                        No uncommitted changes detected.
                      </p>
                    </div>
                  ) : !hasVisibleChangedFiles ? (
                    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
                      <Search className="text-muted-foreground size-5 opacity-50" />
                      <p className="text-xs font-semibold">No matching files</p>
                      <p className="text-muted-foreground text-[10px]">
                        Try a different filter.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {filteredFiles.map((file) => (
                        <div
                          key={file.path}
                          onClick={() => handleFileSelect(file.path)}
                          className={cn(
                            'group flex w-full cursor-pointer items-center gap-3 rounded-md p-2 text-left transition-all',
                            selectedFile === file.path
                              ? 'bg-primary/10 shadow-sm'
                              : 'hover:bg-accent/40',
                          )}
                        >
                          <div
                            className="flex items-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Checkbox
                              checked={selectedFiles.has(file.path)}
                              onCheckedChange={() => toggleFile(file.path)}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={cn(
                                  'truncate text-xs font-medium tracking-tight opacity-70 transition-opacity group-hover:opacity-100',
                                  selectedFile === file.path
                                    ? 'text-primary opacity-100'
                                    : 'text-muted-foreground',
                                )}
                              >
                                {file.path}
                              </span>
                              <div
                                className={cn(
                                  'shrink-0 rounded-sm px-1.5 py-0.5 text-[9px] font-bold uppercase',
                                  file.index === '?'
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                    : 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
                                )}
                              >
                                {file.index === '?' ? 'U' : 'M'}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {hasChangedFiles && (
                  <div className="bg-muted/20 shrink-0 border-t p-4">
                    <div className="space-y-1.5">
                      <input
                        placeholder="Leave blank to autogenerate a conventional commit message"
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        disabled={
                          commitMutation.isPending ||
                          generateCommitMessageMutation.isPending ||
                          reviewCodeMutation.isPending
                        }
                        className="bg-background focus:ring-primary placeholder:text-muted-foreground/50 w-full rounded-md border px-3 py-1.5 text-xs font-medium shadow-sm outline-none focus:ring-1 disabled:opacity-50"
                      />
                      <textarea
                        placeholder="Description (optional)"
                        rows={4}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={
                          commitMutation.isPending ||
                          generateCommitMessageMutation.isPending ||
                          reviewCodeMutation.isPending
                        }
                        className="bg-background focus:ring-primary placeholder:text-muted-foreground/50 w-full resize-none rounded-md border px-3 py-1.5 text-xs shadow-sm outline-none focus:ring-1 disabled:opacity-50"
                      />
                      {codeReview && visibleFindings.length > 0 && (
                        <button
                          onClick={() => setIsReviewModalOpen(true)}
                          className="bg-background/80 hover:bg-accent flex w-full cursor-pointer items-center gap-2 rounded-md border p-3 text-left text-xs font-medium shadow-sm transition-all active:scale-[0.99]"
                        >
                          <ShieldAlert className="text-primary size-3.5 shrink-0" />
                          <span className="min-w-0">
                            Code review: {visibleFindings.length}{' '}
                            {visibleFindings.length === 1
                              ? 'finding'
                              : 'findings'}
                          </span>
                        </button>
                      )}
                      <div className="space-y-1.5 pt-1.5">
                        <button
                          onClick={handleReviewCode}
                          className="border-border bg-background text-foreground hover:bg-accent flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border py-2 text-xs font-bold shadow-sm transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={
                            selectedFiles.size === 0 ||
                            commitMutation.isPending ||
                            generateCommitMessageMutation.isPending ||
                            reviewCodeMutation.isPending
                          }
                        >
                          {reviewCodeMutation.isPending ? (
                            <>
                              <RefreshCw className="size-3 animate-spin" />
                              Reviewing code...
                            </>
                          ) : (
                            <>
                              <ShieldAlert className="size-3" />
                              Review code
                            </>
                          )}
                        </button>
                        <button
                          onClick={handleCommit}
                          className="bg-primary text-primary-foreground flex w-full cursor-pointer items-center justify-center gap-2 rounded-md py-2 text-xs font-bold shadow-md transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={
                            selectedFiles.size === 0 ||
                            commitMutation.isPending ||
                            generateCommitMessageMutation.isPending ||
                            reviewCodeMutation.isPending
                          }
                        >
                          {generateCommitMessageMutation.isPending ? (
                            <>
                              <RefreshCw className="size-3 animate-spin" />
                              Generating message...
                            </>
                          ) : commitMutation.isPending ? (
                            <>
                              <RefreshCw className="size-3 animate-spin" />
                              Committing...
                            </>
                          ) : (
                            `Commit ${selectedFiles.size} ${selectedFiles.size === 1 ? 'file' : 'files'}${data?.currentBranch ? ` to ${data.currentBranch}` : ''}`
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Show last commit if unpushed */}
                {history?.[0]?.isUnpushed && (
                  <div className="bg-muted/10 shrink-0 border-t">
                    <div className="flex items-center justify-between px-4 pb-1 pt-3">
                      <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                        Pending Commit
                      </span>
                      <button
                        onClick={() => undoMutation.mutate(history[0])}
                        disabled={undoMutation.isPending}
                        className="text-muted-foreground hover:text-destructive flex cursor-pointer items-center gap-1.5 text-[10px] font-bold transition-colors disabled:opacity-50"
                      >
                        <RotateCcw
                          className={cn(
                            'size-3',
                            undoMutation.isPending && 'animate-spin',
                          )}
                        />
                        Undo
                      </button>
                    </div>
                    <div
                      onClick={() => handleCommitSelect(history[0].hash)}
                      className={cn(
                        'group relative flex w-full cursor-pointer flex-col gap-0.5 px-4 py-3 text-left transition-colors',
                        selectedCommit === history[0].hash
                          ? 'bg-primary/5'
                          : 'hover:bg-muted/30',
                      )}
                    >
                      {selectedCommit === history[0].hash && (
                        <div className="bg-primary absolute inset-y-0 left-0 w-0.5" />
                      )}
                      <div className="flex items-start justify-between gap-3">
                        <span
                          className={cn(
                            'line-clamp-1 text-[11px] font-semibold tracking-tight transition-colors',
                            selectedCommit === history[0].hash
                              ? 'text-primary'
                              : 'text-foreground/90 group-hover:text-foreground',
                          )}
                        >
                          {history[0].message}
                        </span>
                        <div
                          title="Not pushed to remote"
                          className="text-primary mt-0.5 flex shrink-0 items-center gap-1"
                        >
                          <ArrowUp className="size-3" />
                        </div>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="text-muted-foreground font-mono text-[9px] opacity-70">
                          {formatDistanceToNow(new Date(history[0].date), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="custom-scrollbar flex-1 overflow-y-auto">
              <div className="divide-border/40 divide-y">
                {history?.map((commit) => (
                  <div
                    key={commit.hash}
                    onClick={() => handleCommitSelect(commit.hash)}
                    className={cn(
                      'group relative flex w-full cursor-pointer flex-col gap-0.5 px-4 py-3 text-left transition-colors',
                      selectedCommit === commit.hash
                        ? 'bg-primary/5'
                        : 'hover:bg-muted/50',
                    )}
                  >
                    {selectedCommit === commit.hash && (
                      <div className="bg-primary absolute inset-y-0 left-0 w-0.5" />
                    )}
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className={cn(
                          'line-clamp-2 text-[12px] font-semibold tracking-tight transition-colors',
                          selectedCommit === commit.hash
                            ? 'text-primary'
                            : 'text-foreground/90 group-hover:text-foreground',
                        )}
                      >
                        {commit.message}
                      </span>
                      {commit.isUnpushed && (
                        <div
                          title="Not pushed to remote"
                          className="text-primary mt-0.5 flex shrink-0 items-center gap-1"
                        >
                          <ArrowUp className="size-3" />
                        </div>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-muted-foreground text-[10px] font-medium">
                        {commit.author_name}
                      </span>
                      <span className="text-muted-foreground/30 text-[10px]">
                        •
                      </span>
                      <span className="text-muted-foreground font-mono text-[9px] opacity-70">
                        {formatDistanceToNow(new Date(commit.date), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="bg-card flex min-w-0 flex-1 flex-col overflow-hidden">
          {selectedFile || selectedCommit ? (
            <>
              <div className="bg-background/50 flex h-10 shrink-0 items-center justify-between border-b px-4">
                <div className="flex items-center gap-2 overflow-hidden text-[11px] font-semibold">
                  <span className="text-muted-foreground shrink-0 text-[10px] uppercase tracking-wider">
                    {selectedCommit ? 'Commit:' : 'Reviewing:'}
                  </span>
                  {selectedCommit ? (
                    <button
                      onClick={copyCommitHash}
                      title="Copy commit hash"
                      className="border-muted-foreground/40 hover:text-primary cursor-pointer truncate border-b border-dashed pb-0.5 transition-colors"
                    >
                      {selectedCommit.substring(0, 12)}
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        selectedFile && handleOpenFileInEditor(selectedFile)
                      }
                      title={
                        selectedApp
                          ? `Open with ${selectedApp.name}`
                          : 'Open with editor'
                      }
                      className="border-muted-foreground/40 hover:text-primary cursor-pointer truncate border-b border-dashed pb-0.5 text-left transition-colors"
                    >
                      {selectedFile}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {canUndoSelectedCommit && latestCommit && (
                    <button
                      onClick={() => undoMutation.mutate(latestCommit)}
                      disabled={undoMutation.isPending}
                      className="hover:bg-destructive/10 text-destructive flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2 text-[10px] font-bold transition-all active:scale-95 disabled:opacity-50"
                      title="Undo last commit (keep changes)"
                    >
                      <RotateCcw
                        className={cn(
                          'size-3',
                          undoMutation.isPending && 'animate-spin',
                        )}
                      />
                      Undo Commit
                    </button>
                  )}
                  <div className="flex items-center gap-1.5 rounded border border-green-500/20 bg-green-500/10 px-2 py-1 text-[10px] font-bold text-green-600 shadow-sm dark:text-green-400">
                    <Binary className="size-3" />{' '}
                    {selectedCommit ? 'Commit Details' : 'Unified Diff'}
                  </div>
                </div>
              </div>
              <div className="custom-scrollbar bg-muted/30 flex-1 overflow-auto pb-[var(--chat-safe-padding)] dark:bg-zinc-950/20">
                {loadingDiff ? (
                  <div className="flex min-h-[400px] items-center justify-center">
                    <RefreshCw className="text-primary/40 size-6 animate-spin" />
                  </div>
                ) : (
                  <div className="min-w-fit py-4 font-mono text-[13px] leading-relaxed">
                    {fileDiff ? (
                      fileDiff.split('\n').map((line: string, i: number) => {
                        const isAddition =
                          line.startsWith('+') && !line.startsWith('+++')
                        const isDeletion =
                          line.startsWith('-') && !line.startsWith('---')
                        const isHeader =
                          line.startsWith('diff') ||
                          line.startsWith('index') ||
                          line.startsWith('@@') ||
                          line.startsWith('---') ||
                          line.startsWith('+++')

                        return (
                          <div
                            key={i}
                            className={cn(
                              'hover:bg-foreground/[0.03] group grid grid-cols-[50px_1fr] border-l-4 border-transparent',
                              isAddition &&
                                'border-l-green-600/50 bg-green-500/10 dark:border-l-green-500/60',
                              isDeletion &&
                                'border-l-red-600/50 bg-red-500/10 dark:border-l-red-500/60',
                              isHeader &&
                                'text-muted-foreground bg-sky-500/5 py-0.5 font-bold tracking-tight',
                            )}
                          >
                            <div className="border-foreground/5 table-cell select-none border-r pr-5 text-right align-middle font-sans text-[10px] opacity-40 dark:opacity-20">
                              {i + 1}
                            </div>
                            <div
                              className={cn(
                                'whitespace-pre px-5 tabular-nums',
                                isAddition &&
                                  'text-green-700 dark:text-green-400',
                                isDeletion && 'text-red-700 dark:text-red-400',
                                isHeader && 'text-sky-700 dark:text-sky-300',
                                !isAddition &&
                                  !isDeletion &&
                                  !isHeader &&
                                  'text-foreground/80 dark:text-zinc-300',
                              )}
                            >
                              {line || ' '}
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="flex min-h-[400px] items-center justify-center font-sans italic opacity-20">
                        No changes to display
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="group flex flex-1 flex-col items-center justify-center gap-8 p-12 text-center opacity-40">
              <div className="border-muted bg-muted/5 flex size-28 rotate-6 items-center justify-center rounded-3xl border-2 border-dashed transition-transform duration-500 group-hover:rotate-0">
                <GitPullRequest className="text-muted-foreground size-14 -rotate-6 transition-transform duration-500 group-hover:rotate-0" />
              </div>
              <div className="max-w-[340px] space-y-2">
                <h3 className="text-foreground text-xl font-bold tracking-tight">
                  Git Repository Insight
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Select any entry from your local changes to inspect the
                  unified diff and review line-by-line before committing.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
