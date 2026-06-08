import {
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Landmark,
  Loader2,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react'
import { useEffect } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@moldable-ai/ui'
import {
  openExternalUrl,
  useConnect,
  usePlaidReadiness,
} from '../data/accounts'

const PLAID_KEYS_URL = 'https://dashboard.plaid.com/developers/keys'

/**
 * Inline "connect an account" dialog. Walks the user through the Plaid handoff
 * (which opens in their external browser for security) and auto-detects when the
 * institution lands, then refreshes the product into live data.
 *
 * Because Money is local-first and each person brings their own Plaid keys, we
 * pre-check readiness when the dialog opens: a fresh user with no keys yet gets a
 * "connect your Plaid keys" setup card (pointing at Moldable Settings → Vault)
 * instead of clicking Connect and hitting a dead-end error.
 */
export function ConnectDialog({
  open,
  onOpenChange,
  onConnected,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConnected?: () => void
}) {
  const { phase, error, start, cancel } = useConnect()
  const readiness = usePlaidReadiness(open)
  const needsKeys = readiness.data?.credentialsMissing ?? false

  // Auto-finish shortly after success so the user sees the confirmation.
  useEffect(() => {
    if (phase !== 'success') return
    const t = setTimeout(() => {
      onConnected?.()
      onOpenChange(false)
    }, 1400)
    return () => clearTimeout(t)
  }, [phase, onConnected, onOpenChange])

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) cancel()
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-md">
        {phase === 'success' ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="text-success size-10" />
            <DialogTitle className="text-lg">Account connected</DialogTitle>
            <DialogDescription>Pulling in your real numbers…</DialogDescription>
          </div>
        ) : phase === 'awaiting' ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Loader2 className="text-muted-foreground size-9 animate-spin" />
            <DialogTitle className="text-lg">
              Finish in your browser
            </DialogTitle>
            <DialogDescription>
              We opened your bank’s secure login in a new window. Complete it
              there — we’ll detect it and update automatically.
            </DialogDescription>
            <Button variant="ghost" className="mt-1" onClick={cancel}>
              Cancel
            </Button>
          </div>
        ) : needsKeys ? (
          <PlaidSetupCard
            message={readiness.data?.message}
            commands={readiness.data?.setupCommands}
          />
        ) : (
          <>
            <DialogHeader>
              <div className="bg-muted mb-1 flex size-11 items-center justify-center rounded-xl">
                <Landmark className="size-5" />
              </div>
              <DialogTitle className="text-lg">Connect an account</DialogTitle>
              <DialogDescription>
                Securely link a bank, card, or brokerage with Plaid. Your
                dashboards fill in with your real numbers — Money never sees
                your bank password.
              </DialogDescription>
            </DialogHeader>

            <ul className="text-muted-foreground my-2 space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <ShieldCheck className="text-success size-4 shrink-0" />
                Bank-grade encryption via Plaid
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="text-success size-4 shrink-0" />
                Read-only — we can’t move your money
              </li>
            </ul>

            {phase === 'error' && error ? (
              <div
                role="alert"
                className="border-destructive/40 bg-destructive/5 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2 text-sm"
              >
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                {error}
              </div>
            ) : null}

            <Button
              size="lg"
              className="mt-1 w-full"
              disabled={phase === 'starting' || readiness.isLoading}
              onClick={() => void start()}
            >
              {phase === 'starting' ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Landmark className="size-4" />
              )}
              {phase === 'error' ? 'Try again' : 'Connect securely'}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

/**
 * Shown when the user hasn't configured their own Plaid keys yet. Points at the
 * host's secret store (Moldable Settings → Vault) — the canonical place Moldable
 * apps collect provider API keys — with a link to grab the keys and a copyable
 * headless fallback.
 */
function PlaidSetupCard({
  message,
  commands,
}: {
  message?: string
  commands?: string[]
}) {
  return (
    <>
      <DialogHeader>
        <div className="bg-muted mb-1 flex size-11 items-center justify-center rounded-xl">
          <KeyRound className="size-5" />
        </div>
        <DialogTitle className="text-lg">Connect your Plaid keys</DialogTitle>
        <DialogDescription>
          {message ??
            'Money links your accounts through your own Plaid keys. Add them once and connecting takes seconds.'}
        </DialogDescription>
      </DialogHeader>

      <ol className="text-muted-foreground my-2 space-y-2 text-sm">
        <li className="flex gap-2">
          <span className="text-foreground font-semibold">1.</span>
          <span>
            Grab your{' '}
            <span className="text-foreground font-medium">Plaid Client ID</span>{' '}
            and <span className="text-foreground font-medium">Secret</span> from
            the Plaid dashboard.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-foreground font-semibold">2.</span>
          <span>
            Add{' '}
            <span className="text-foreground font-medium">PLAID_CLIENT_ID</span>{' '}
            and{' '}
            <span className="text-foreground font-medium">PLAID_SECRET</span> in{' '}
            <span className="text-foreground font-medium">
              Moldable Settings → Vault
            </span>
            .
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-foreground font-semibold">3.</span>
          <span>Reopen this dialog and connect.</span>
        </li>
      </ol>

      <Button
        size="lg"
        className="mt-1 w-full"
        onClick={() => openExternalUrl(PLAID_KEYS_URL)}
      >
        <ExternalLink className="size-4" />
        Get your Plaid keys
      </Button>

      {commands && commands.length ? (
        <details className="text-muted-foreground mt-2 text-xs">
          <summary className="hover:text-foreground cursor-pointer select-none">
            Prefer the command line?
          </summary>
          <pre className="border-border/60 bg-muted/40 text-foreground mt-2 overflow-x-auto rounded-lg border p-3 text-[11px] leading-relaxed">
            {commands.join('\n')}
          </pre>
        </details>
      ) : null}
    </>
  )
}
