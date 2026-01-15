'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowUp,
  Binary,
  Copy,
  FolderGit,
  FolderOpen,
  GitBranch,
  GitCommit,
  Github,
  History,
  LayoutList,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Terminal,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useWorkspace } from '@moldable-ai/ui'
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

interface GitData {
  currentBranch: string
  repoName: string
  repoPath: string
  files: GitFile[]
  recentRepos: { name: string; path: string }[]
  branches: string[]
}

interface LogEntry {
  hash: string
  date: string
  message: string
  author_name: string
  author_email: string
  isUnpushed?: boolean
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

  // Mutation for Committing
  const commitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchWithWorkspace('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'commit',
          paths: Array.from(selectedFiles),
          summary,
          description,
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
    onSuccess: (json) => {
      queryClient.setQueryData(['git-status', workspaceId], json)
      const firstFile = json.files?.[0]?.path || null
      setSelectedFile(firstFile)
      if (json.files) {
        setSelectedFiles(new Set(json.files.map((f: GitFile) => f.path)))
      }
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  // Auto-select first file on initial load
  useEffect(() => {
    if (data?.files && data.files.length > 0 && !selectedFile) {
      setSelectedFile(data.files[0].path)
      setSelectedFiles(new Set(data.files.map((f: GitFile) => f.path)))
    }
  }, [data, selectedFile])

  const handleFileSelect = (filePath: string) => {
    setSelectedCommit(null)
    setSelectedFile(filePath)
  }

  const handleCommitSelect = (hash: string) => {
    setSelectedFile(null)
    setSelectedCommit(hash)
  }

  const handleCommit = () => {
    if (selectedFiles.size === 0) {
      setError('Please select at least one file to commit.')
      return
    }
    setError(null)
    commitMutation.mutate()
  }

  const copyError = () => {
    if (error) {
      navigator.clipboard.writeText(error)
    }
  }

  const toggleFile = (path: string) => {
    const newSelected = new Set(selectedFiles)
    if (newSelected.has(path)) {
      newSelected.delete(path)
    } else {
      newSelected.add(path)
    }
    setSelectedFiles(newSelected)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked && data?.files) {
      setSelectedFiles(new Set(data.files.map((f) => f.path)))
    } else {
      setSelectedFiles(new Set())
    }
  }

  const handleRepoChange = (repoPath: string) => {
    setError(null)
    repoMutation.mutate(repoPath)
  }

  const handlePickFolder = async () => {
    const tauriWindow = window as Window & {
      __TAURI__?: {
        dialog: {
          open: (opts: {
            directory: boolean
            multiple: boolean
            title: string
          }) => Promise<string | string[] | null>
        }
      }
    }
    if (!tauriWindow.__TAURI__) {
      setError('Folder picker is only available in the Moldable desktop app.')
      return
    }

    try {
      const { open } = tauriWindow.__TAURI__.dialog
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Git Repository',
      })

      if (selected && typeof selected === 'string') {
        handleRepoChange(selected)
      } else if (Array.isArray(selected) && selected[0]) {
        handleRepoChange(selected[0])
      }
    } catch {
      setError('Failed to open folder picker.')
    }
  }

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
                      <span className="text-xs font-semibold leading-none">
                        {repo.name}
                      </span>
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
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => pushMutation.mutate()}
            disabled={pushMutation.isPending}
            title="Push to Remote"
            className="hover:bg-primary/10 text-primary flex h-8 cursor-pointer items-center gap-2 rounded-md px-3 text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
          >
            {pushMutation.isPending ? (
              <RefreshCw className="size-3.5 animate-spin" />
            ) : (
              <ArrowUp className="size-3.5" />
            )}
            Push
          </button>
          <div className="bg-border/60 h-4 w-px" />
          <button
            onClick={() => fetchData()}
            title="Refresh Status"
            className="hover:bg-accent text-muted-foreground flex size-8 cursor-pointer items-center justify-center rounded-md transition-all active:scale-95"
          >
            <RefreshCw
              className={cn('size-4', loading && 'text-primary animate-spin')}
            />
          </button>
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
                    Commit Failed
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

        {/* Sidebar */}
        <aside className="bg-muted/5 flex w-72 shrink-0 flex-col border-r pb-[var(--chat-safe-padding)]">
          <div className="flex h-10 shrink-0 items-center border-b px-2">
            <button
              onClick={() => setView('changes')}
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
            <button
              onClick={() => setView('history')}
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
              <div className="bg-muted/10 flex shrink-0 items-center justify-between border-b p-3.5">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all"
                    checked={
                      (data?.files?.length ?? 0) > 0 &&
                      selectedFiles.size === (data?.files?.length ?? 0)
                    }
                    onCheckedChange={(checked) =>
                      handleSelectAll(checked === true)
                    }
                  />
                  <h2 className="text-foreground text-[12px] font-semibold">
                    {data?.files?.length || 0} changed{' '}
                    {data?.files?.length === 1 ? 'file' : 'files'}
                  </h2>
                </div>
              </div>

              <div className="custom-scrollbar flex-1 overflow-y-auto p-2">
                {data?.files?.length === 0 ? (
                  <div className="-mt-8 flex h-full flex-col items-center justify-center opacity-40 grayscale">
                    <div className="border-muted mb-3 flex size-12 items-center justify-center rounded-full border-2 border-dashed">
                      <GitCommit className="size-6" />
                    </div>
                    <p className="text-xs font-semibold">Workspace clean</p>
                    <p className="mt-1 px-6 text-center text-[10px] opacity-70">
                      No uncommitted changes detected.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {data?.files?.map((file) => (
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

              <div className="bg-muted/20 shrink-0 border-t p-4">
                <div className="space-y-1.5">
                  <input
                    placeholder="Commit summary..."
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    disabled={commitMutation.isPending}
                    className="bg-background focus:ring-primary placeholder:text-muted-foreground/50 w-full rounded-md border px-3 py-1.5 text-xs font-medium shadow-sm outline-none focus:ring-1 disabled:opacity-50"
                  />
                  <textarea
                    placeholder="Description (optional)"
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={commitMutation.isPending}
                    className="bg-background focus:ring-primary placeholder:text-muted-foreground/50 w-full resize-none rounded-md border px-3 py-1.5 text-xs shadow-sm outline-none focus:ring-1 disabled:opacity-50"
                  />
                  <div className="pt-1.5">
                    <button
                      onClick={handleCommit}
                      className="bg-primary text-primary-foreground flex w-full cursor-pointer items-center justify-center gap-2 rounded-md py-2 text-xs font-bold shadow-md transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={
                        selectedFiles.size === 0 ||
                        commitMutation.isPending ||
                        !summary.trim()
                      }
                    >
                      {commitMutation.isPending ? (
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
                  <span className="border-muted-foreground/40 truncate border-b border-dashed pb-0.5">
                    {selectedCommit
                      ? selectedCommit.substring(0, 12)
                      : selectedFile}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {selectedCommit && history?.[0]?.hash === selectedCommit && (
                    <button
                      onClick={() => undoMutation.mutate(history[0])}
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
                <Github className="text-muted-foreground size-14 -rotate-6 transition-transform duration-500 group-hover:rotate-0" />
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
