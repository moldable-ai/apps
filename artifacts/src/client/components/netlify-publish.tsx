// The Netlify publishing surface — a single self-contained provider row.
//
// Everything Netlify-specific lives here so shared publish chrome stays
// provider-agnostic. It drives the existing hosting API helpers:
//   connect  → startHostingConnection('netlify') → open the OAuth URL via the
//              host, then wait for the callback's `hosting-oauth-success`
//              postMessage (with a window-focus refetch as a fallback).
//   publish  → ensure a Netlify target exists (create once), then deploy it.
//              Subsequent publishes redeploy that SAME target — never duplicate.
// Tokens/secrets never touch client state; the backend holds NETLIFY_TOKEN in
// workspace-scoped aivault. We only ever see connection metadata + public URLs.
import {
  AlertCircle,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  RefreshCw,
  Rocket,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Api, HostingProviderInfo, HostingTarget } from '../lib/api'
import { Button, Input, sendToMoldable } from '../lib/moldable-ui'
import type { Artifact } from '../../shared/types'
import { ProviderRow } from './provider-row'

const PROVIDER = 'netlify' as const

function errText(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong.'
}

// Netlify's teal brand mark (a small badge — recognizable without shipping the
// full trademarked logo).
function NetlifyMark() {
  return (
    <span
      aria-hidden
      className="flex size-5 items-center justify-center rounded-[6px] bg-gradient-to-br from-teal-400 to-cyan-500 text-white shadow-sm"
    >
      <svg
        viewBox="0 0 24 24"
        className="size-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3l9 9-9 9-9-9 9-9z" />
      </svg>
    </span>
  )
}

function StatusChip({
  tone,
  children,
}: {
  tone: 'muted' | 'live' | 'busy' | 'error'
  children: React.ReactNode
}) {
  const cls = {
    muted: 'text-muted-foreground',
    live: 'text-emerald-500',
    busy: 'text-muted-foreground',
    error: 'text-destructive',
  }[tone]
  return (
    <span
      className={`flex items-center gap-1.5 text-[11px] font-medium ${cls}`}
    >
      {tone === 'live' ? (
        <span className="size-1.5 rounded-full bg-emerald-500" />
      ) : null}
      {tone === 'busy' ? <Loader2 className="size-3 animate-spin" /> : null}
      {children}
    </span>
  )
}

export function NetlifyPublishRow({
  artifact,
  api,
  active,
  canPublish,
}: {
  artifact: Artifact
  api: Api
  /** The publish popover is open — fetch/refresh status while true. */
  active: boolean
  canPublish: boolean
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [provider, setProvider] = useState<HostingProviderInfo | null>(null)
  const [target, setTarget] = useState<HostingTarget | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const [copied, setCopied] = useState(false)
  const loadedRef = useRef(false)

  const connected = Boolean(provider?.connected)
  const setupError = provider?.setupError
  // The backend only sets target.url on a *successful* deploy, so a present URL
  // is always safe to show — even while Netlify finishes propagating (status can
  // still read 'deploying' if the deploy poll returned before it went 'ready').
  const liveUrl = target?.url || undefined
  const targetDeploying = deploying || target?.status === 'deploying'
  const targetError =
    target?.status === 'error'
      ? target.error || 'The last Netlify publish failed.'
      : null
  const visibleError = error ?? targetError

  const refresh = useCallback(
    async (opts?: { quiet?: boolean }) => {
      if (!opts?.quiet) setLoading(true)
      try {
        const [providers, targets] = await Promise.all([
          api.listHostingProviders(),
          api.listHostingTargets(artifact.id),
        ])
        setProvider(providers.find((p) => p.id === PROVIDER) ?? null)
        setTarget(targets.find((t) => t.provider === PROVIDER) ?? null)
        setError(null)
      } catch (e) {
        setError(errText(e))
      } finally {
        setLoading(false)
      }
    },
    [api, artifact.id],
  )

  // Refresh status whenever the popover opens so the header chip is accurate.
  useEffect(() => {
    if (!active) return
    loadedRef.current = true
    void refresh()
  }, [active, refresh])

  // The OAuth callback posts `hosting-oauth-success` to the opener when the user
  // finishes authorizing. Listen for it, then refetch.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const data = e.data as { type?: string; provider?: string } | null
      if (
        data?.type === 'hosting-oauth-success' &&
        data.provider === PROVIDER
      ) {
        setConnecting(false)
        setOpen(true)
        void refresh({ quiet: true })
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [refresh])

  // Fallback: the host may open the OAuth URL in an external browser (so the
  // opener postMessage never reaches us). When the user returns to the app,
  // re-check the connection.
  useEffect(() => {
    if (!connecting) return
    function recheck() {
      void refresh({ quiet: true })
    }
    window.addEventListener('focus', recheck)
    document.addEventListener('visibilitychange', recheck)
    return () => {
      window.removeEventListener('focus', recheck)
      document.removeEventListener('visibilitychange', recheck)
    }
  }, [connecting, refresh])

  // Clear the pending state once a connection actually lands.
  useEffect(() => {
    if (connected && connecting) setConnecting(false)
  }, [connected, connecting])

  // While a deploy is still settling on Netlify's side (status 'deploying'),
  // poll until it flips to 'ready' so the "Live" state and status chip catch up.
  useEffect(() => {
    if (target?.status !== 'deploying') return
    let tries = 0
    const iv = setInterval(() => {
      tries += 1
      if (tries > 12) {
        clearInterval(iv)
        return
      }
      void refresh({ quiet: true })
    }, 3000)
    return () => clearInterval(iv)
  }, [target?.status, refresh])

  const connect = async () => {
    setError(null)
    setConnecting(true)
    try {
      const { url } = await api.startHostingConnection(PROVIDER)
      sendToMoldable({ type: 'moldable:open-url', url })
    } catch (e) {
      setError(errText(e))
      setConnecting(false)
    }
  }

  const deploy = async () => {
    if (!connected || deploying) return
    setError(null)
    setDeploying(true)
    try {
      // Reuse the artifact's existing Netlify target; only create one the first
      // time so repeat publishes redeploy in place instead of duplicating.
      const t =
        target ??
        (await api.createHostingTarget(artifact.id, { provider: PROVIDER }))
      const result = await api.deployHostingTarget(artifact.id, t.id)
      // Prefer the target's own url, but fall back to the deploy result's url so
      // the live link always shows on a successful deploy.
      setTarget({ ...result.target, url: result.target.url || result.url })
    } catch (e) {
      setError(errText(e))
    } finally {
      setDeploying(false)
      void refresh({ quiet: true })
    }
  }

  const disconnect = async () => {
    setError(null)
    try {
      await api.disconnectHostingProvider(PROVIDER)
      setTarget(null)
      await refresh({ quiet: true })
    } catch (e) {
      setError(errText(e))
    }
  }

  const removeTarget = async () => {
    if (!target) return
    setError(null)
    try {
      await api.deleteHostingTarget(artifact.id, target.id)
      setTarget(null)
      await refresh({ quiet: true })
    } catch (e) {
      setError(errText(e))
    }
  }

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // best-effort
    }
  }

  const status = setupError ? (
    <StatusChip tone="error">Unavailable</StatusChip>
  ) : targetError ? (
    <StatusChip tone="error">Failed</StatusChip>
  ) : targetDeploying ? (
    <StatusChip tone="busy">Deploying…</StatusChip>
  ) : liveUrl ? (
    <StatusChip tone="live">Live</StatusChip>
  ) : connecting ? (
    <StatusChip tone="busy">Connecting…</StatusChip>
  ) : connected ? (
    <StatusChip tone="muted">Connected</StatusChip>
  ) : (
    <StatusChip tone="muted">Not connected</StatusChip>
  )

  return (
    <ProviderRow
      icon={<NetlifyMark />}
      name="Netlify"
      status={status}
      open={open}
      onOpenChange={setOpen}
    >
      {setupError ? (
        <p className="text-muted-foreground text-xs">
          Netlify hosting isn’t configured on this server yet.
        </p>
      ) : loading && !provider ? (
        <p className="text-muted-foreground flex items-center gap-2 text-xs">
          <Loader2 className="size-3.5 animate-spin" /> Checking Netlify…
        </p>
      ) : !connected ? (
        <div className="space-y-2.5">
          <p className="text-muted-foreground text-xs">
            Deploy this artifact to your own Netlify site. Connect your account
            to get started.
          </p>
          <Button
            variant="outline"
            disabled={connecting}
            onClick={connect}
            className="w-full"
          >
            {connecting ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Waiting for Netlify…
              </>
            ) : (
              'Connect Netlify'
            )}
          </Button>
          {connecting ? (
            <button
              type="button"
              onClick={() => void refresh({ quiet: true })}
              className="text-muted-foreground hover:text-foreground mx-auto flex cursor-pointer items-center gap-1.5 text-[11px]"
            >
              <RefreshCw className="size-3" /> Finished in the browser? Check
              again
            </button>
          ) : (
            <p className="text-muted-foreground/80 text-[11px]">
              Opens Netlify in your browser to authorize.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {liveUrl ? (
            <>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={liveUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  aria-label="Netlify site URL"
                  className="h-9 flex-1 text-xs"
                />
                <button
                  type="button"
                  title="Copy link"
                  onClick={() => copy(liveUrl)}
                  className="border-border hover:bg-muted inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors"
                >
                  {copied ? (
                    <Check className="size-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() =>
                    sendToMoldable({ type: 'moldable:open-url', url: liveUrl })
                  }
                >
                  <ExternalLink className="size-3.5" /> Open
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={targetDeploying}
                  onClick={deploy}
                >
                  {targetDeploying ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="size-3.5" />
                  )}
                  {targetDeploying
                    ? 'Deploying…'
                    : targetError
                      ? 'Retry deploy'
                      : 'Redeploy'}
                </Button>
              </div>
              {targetDeploying ? (
                <p className="text-muted-foreground text-[11px]">
                  Live now — Netlify is finishing the deploy.
                </p>
              ) : null}
            </>
          ) : (
            <Button
              className="w-full"
              disabled={targetDeploying || !canPublish}
              onClick={deploy}
            >
              {targetDeploying ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Deploying…
                </>
              ) : (
                <>
                  <Rocket className="size-4" />{' '}
                  {targetError ? 'Retry Netlify publish' : 'Publish to Netlify'}
                </>
              )}
            </Button>
          )}

          {!canPublish && !liveUrl ? (
            <p className="text-muted-foreground text-[11px]">
              Add content first to publish.
            </p>
          ) : null}

          {/* Secondary, low-emphasis affordances. */}
          <div className="text-muted-foreground/80 flex items-center justify-end gap-3 pt-0.5 text-[11px]">
            {target ? (
              <button
                type="button"
                onClick={() => void removeTarget()}
                className="hover:text-destructive flex cursor-pointer items-center gap-1"
              >
                <Trash2 className="size-3" /> Remove site
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void disconnect()}
              className="hover:text-foreground cursor-pointer"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}

      {visibleError ? (
        <div className="text-destructive mt-2.5 flex items-start gap-1.5 text-xs">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          <span>{visibleError}</span>
        </div>
      ) : null}
    </ProviderRow>
  )
}
