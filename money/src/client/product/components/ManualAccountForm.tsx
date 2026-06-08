import { Loader2, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from '@moldable-ai/ui'
import {
  type ManualAccountInput,
  type ManualAccountType,
  type MoneyAccount,
  useAddManualAccount,
  useDeleteManualAccount,
  useUpdateManualAccount,
} from '../data/accounts'

type Kind = 'asset' | 'liability'

interface TypeOption {
  id: string
  label: string
  type: ManualAccountType
  subtype: string
  investmentAccountKind?: string
}

const TYPES: Record<Kind, TypeOption[]> = {
  asset: [
    {
      id: 'home',
      label: 'Home / real estate',
      type: 'other',
      subtype: 'real_estate',
    },
    { id: 'vehicle', label: 'Vehicle', type: 'other', subtype: 'vehicle' },
    { id: 'cash', label: 'Cash / savings', type: 'cash', subtype: 'savings' },
    {
      id: 'investment',
      label: 'Investment / brokerage',
      type: 'investment',
      subtype: 'brokerage',
      investmentAccountKind: 'brokerage',
    },
    {
      id: 'other-asset',
      label: 'Other asset',
      type: 'other',
      subtype: 'other',
    },
  ],
  liability: [
    {
      id: 'mortgage',
      label: 'Mortgage',
      type: 'mortgage',
      subtype: 'mortgage',
    },
    { id: 'loan', label: 'Loan', type: 'loan', subtype: 'loan' },
    {
      id: 'credit',
      label: 'Credit card',
      type: 'credit',
      subtype: 'credit card',
    },
    {
      id: 'other-liab',
      label: 'Other liability',
      type: 'other',
      subtype: 'other',
    },
  ],
}

function kindForAccount(a?: MoneyAccount | null): Kind {
  if (!a) return 'asset'
  if (a.isLiability || (a.currentBalance ?? 0) < 0) return 'liability'
  return 'asset'
}

function typeIdForAccount(a: MoneyAccount, kind: Kind): string {
  const sub = (a.subtype ?? '').toLowerCase()
  return TYPES[kind].find((t) => t.subtype === sub)?.id ?? TYPES[kind][0].id
}

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Add or edit a **manual account** — an asset (a home, a car) or a liability (a
 * mortgage, a loan) that Plaid can't see — with a name, value, and an "as of"
 * date. It writes a manual account (`POST/PATCH/DELETE /api/accounts`) that flows
 * into net worth and the liquid/illiquid breakdown exactly like a real one.
 * Creation/editing lives on the Accounts page; the dashboards just reflect it.
 */
export function ManualAccountForm({
  open,
  account,
  onClose,
}: {
  open: boolean
  /** Present → edit mode. */
  account?: MoneyAccount | null
  onClose: () => void
}) {
  const editing = Boolean(account)
  const add = useAddManualAccount()
  const update = useUpdateManualAccount()
  const remove = useDeleteManualAccount()

  const [kind, setKind] = useState<Kind>('asset')
  const [typeId, setTypeId] = useState('home')
  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  const [asOf, setAsOf] = useState(todayISODate())
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!open) return
    const k = kindForAccount(account)
    setKind(k)
    setTypeId(account ? typeIdForAccount(account, k) : TYPES[k][0].id)
    setName(account?.name ?? '')
    setValue(account ? String(Math.abs(account.currentBalance ?? 0)) : '')
    setAsOf(
      (account?.asOf ?? account?.updatedAt ?? '').slice(0, 10) ||
        todayISODate(),
    )
    setConfirmDelete(false)
    add.reset()
    update.reset()
    remove.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, account?.id])

  const setKindAndType = (k: Kind) => {
    setKind(k)
    setTypeId(TYPES[k][0].id)
  }

  const opt = TYPES[kind].find((t) => t.id === typeId) ?? TYPES[kind][0]
  const numeric = Number(value.replace(/[^0-9.-]/g, ''))
  const valid =
    name.trim().length > 0 &&
    Number.isFinite(numeric) &&
    numeric > 0 &&
    Boolean(asOf)
  const pending = add.isPending || update.isPending || remove.isPending
  const error = (add.error ?? update.error ?? remove.error) as Error | null

  const submit = () => {
    if (!valid || pending) return
    const magnitude = Math.abs(numeric)
    const payload: ManualAccountInput = {
      name: name.trim(),
      type: opt.type,
      subtype: opt.subtype,
      currentBalance: kind === 'asset' ? magnitude : -magnitude,
      isAsset: kind === 'asset',
      isLiability: kind === 'liability',
      asOf: `${asOf}T00:00:00.000Z`,
      ...(opt.investmentAccountKind
        ? { investmentAccountKind: opt.investmentAccountKind }
        : {}),
    }
    const done = { onSuccess: () => onClose() }
    if (editing && account) update.mutate({ id: account.id, ...payload }, done)
    else add.mutate(payload, done)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? 'Edit manual account' : 'Add a manual account'}
          </DialogTitle>
          <DialogDescription>
            Track something Plaid can’t see — a home, a car, a mortgage — so
            your net worth is complete.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <Field label="This is a">
            <div
              role="group"
              className="bg-muted inline-flex w-full rounded-lg p-0.5 text-sm"
            >
              {(['asset', 'liability'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKindAndType(k)}
                  aria-pressed={kind === k}
                  className={cn(
                    'flex-1 rounded-md px-3 py-1 font-medium capitalize transition-colors',
                    kind === k
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {k}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={kind === 'asset' ? 'e.g. Home' : 'e.g. Mortgage'}
              autoFocus
            />
          </Field>
          <Field label="Type">
            <Select value={typeId} onValueChange={setTypeId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES[kind].map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={kind === 'asset' ? 'Value' : 'Amount owed'}>
              <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                inputMode="decimal"
                placeholder="750000"
              />
            </Field>
            <Field label="As of">
              <Input
                type="date"
                value={asOf}
                onChange={(e) => setAsOf(e.target.value)}
              />
            </Field>
          </div>
          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error.message}
            </p>
          ) : null}
        </div>

        {confirmDelete && account ? (
          <DialogFooter className="flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-muted-foreground text-sm">
              Remove this account? Net worth will no longer include it.
            </span>
            <div className="flex shrink-0 gap-2">
              <Button
                variant="ghost"
                disabled={pending}
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={pending}
                onClick={() =>
                  remove.mutate(account.id, { onSuccess: () => onClose() })
                }
              >
                {pending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                Remove
              </Button>
            </div>
          </DialogFooter>
        ) : (
          <DialogFooter className="gap-2 sm:justify-between">
            {editing && account ? (
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive"
                disabled={pending}
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="size-4" /> Remove
              </Button>
            ) : (
              <span />
            )}
            <Button onClick={submit} disabled={!valid || pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              {editing ? 'Save' : 'Add account'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      {children}
    </label>
  )
}
