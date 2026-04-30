import {
  Check,
  ChevronDown,
  Copy,
  Loader2,
  Plus,
  RefreshCw,
} from 'lucide-react'
import { useState } from 'react'
import {
  Button,
  Checkbox,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Dialog,
  DialogContent,
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
  CONNECTION_COLORS,
  CONNECTION_ENVIRONMENTS,
  buildPostgresConnectionUrl,
  parsePostgresConnectionUrl,
} from '../lib/sql'
import type { ConnectionFormDialogProps } from '../types'
import { DialogField } from './shared'

export function ConnectionFormDialog({
  mode,
  connectionForm,
  testData,
  error,
  testing,
  saving,
  onClose,
  onChange,
  onTest,
  onSubmit,
}: ConnectionFormDialogProps) {
  const [manualOpen, setManualOpen] = useState(mode === 'edit')
  const [copiedUrl, setCopiedUrl] = useState(false)
  const rawSelectedColor = connectionForm.color ?? CONNECTION_COLORS[0]
  const selectedColor = CONNECTION_COLORS.some(
    (color) => color.toLowerCase() === rawSelectedColor.toLowerCase(),
  )
    ? rawSelectedColor
    : CONNECTION_COLORS[0]

  function updateForm<K extends keyof typeof connectionForm>(
    key: K,
    value: (typeof connectionForm)[K],
  ) {
    const nextForm = {
      ...connectionForm,
      [key]: value,
    }

    onChange(key, value)

    if (key !== 'connectionUrl') {
      onChange('connectionUrl', buildPostgresConnectionUrl(nextForm))
    }
  }

  function applyParsedUrl(nextUrl: string) {
    onChange('connectionUrl', nextUrl)

    let nextParsed: ReturnType<typeof parsePostgresConnectionUrl>
    try {
      nextParsed = parsePostgresConnectionUrl(nextUrl)
    } catch {
      return
    }

    setManualOpen(true)
    const generatedUrl = buildPostgresConnectionUrl(nextParsed)
    onChange('connectionUrl', generatedUrl)
    onChange('name', nextParsed.name)
    onChange('host', nextParsed.host)
    onChange('port', nextParsed.port)
    onChange('database', nextParsed.database)
    onChange('user', nextParsed.user)
    onChange('password', nextParsed.password)
    onChange('ssl', nextParsed.ssl)
    onChange('color', nextParsed.color)
    onChange('environment', nextParsed.environment)
  }

  async function copyConnectionUrl() {
    const url =
      connectionForm.connectionUrl.trim() ||
      buildPostgresConnectionUrl(connectionForm)
    await navigator.clipboard.writeText(url)
    setCopiedUrl(true)
    window.setTimeout(() => setCopiedUrl(false), 1200)
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? 'Edit connection' : 'New connection'}
          </DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit}>
          <DialogField label="Connection URL">
            <div className="relative">
              <Input
                className="h-9 pr-10 font-mono text-xs"
                placeholder="postgresql://user:password@host:5432/database"
                value={connectionForm.connectionUrl}
                onChange={(event) => applyParsedUrl(event.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground absolute right-1.5 top-1/2 -translate-y-1/2 cursor-pointer"
                onClick={() => void copyConnectionUrl()}
                aria-label="Copy connection URL"
              >
                {copiedUrl ? (
                  <Check className="size-3.5" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </Button>
            </div>
          </DialogField>

          <Collapsible open={manualOpen} onOpenChange={setManualOpen}>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground h-7 cursor-pointer px-0 hover:bg-transparent"
              >
                <ChevronDown
                  className={cn(
                    'size-3.5 transition-transform',
                    !manualOpen && '-rotate-90',
                  )}
                />
                Connection details
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-5 pt-3">
              <div className="grid gap-x-3 gap-y-4 md:grid-cols-[1fr_180px]">
                <DialogField label="Color">
                  <div className="flex min-h-8 flex-wrap items-center gap-2">
                    {CONNECTION_COLORS.map((color) => {
                      const selected =
                        selectedColor.toLowerCase() === color.toLowerCase()

                      return (
                        <button
                          key={color}
                          type="button"
                          className={cn(
                            'border-border relative size-7 cursor-pointer rounded-md border transition-shadow',
                            selected &&
                              'ring-ring ring-offset-background ring-2 ring-offset-2',
                          )}
                          style={{ backgroundColor: color }}
                          aria-label={`Use ${color}`}
                          aria-pressed={selected}
                          onClick={() => updateForm('color', color)}
                        >
                          {selected ? (
                            <span className="absolute inset-0 flex items-center justify-center">
                              <span className="bg-background/90 text-foreground flex size-4 items-center justify-center rounded-full shadow-sm">
                                <Check className="size-3" />
                              </span>
                            </span>
                          ) : null}
                        </button>
                      )
                    })}
                  </div>
                </DialogField>
                <DialogField label="Type">
                  <Select
                    value={connectionForm.environment ?? 'none'}
                    onValueChange={(value) =>
                      updateForm('environment', value === 'none' ? null : value)
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONNECTION_ENVIRONMENTS.map((environment) => (
                        <SelectItem key={environment} value={environment}>
                          {environment}
                        </SelectItem>
                      ))}
                      <SelectItem value="none">No type</SelectItem>
                    </SelectContent>
                  </Select>
                </DialogField>
              </div>
              <div className="grid gap-x-3 gap-y-4 md:grid-cols-2">
                <DialogField label="Name">
                  <Input
                    className="h-8"
                    placeholder="[Localhost] Project"
                    value={connectionForm.name}
                    onChange={(event) => updateForm('name', event.target.value)}
                  />
                </DialogField>
                <DialogField label="Database">
                  <Input
                    className="h-8"
                    placeholder="postgres"
                    value={connectionForm.database}
                    onChange={(event) =>
                      updateForm('database', event.target.value)
                    }
                  />
                </DialogField>
                <DialogField label="Host">
                  <Input
                    className="h-8"
                    placeholder="localhost"
                    value={connectionForm.host}
                    onChange={(event) => updateForm('host', event.target.value)}
                  />
                </DialogField>
                <DialogField label="Port">
                  <Input
                    className="h-8"
                    placeholder="5432"
                    value={connectionForm.port}
                    onChange={(event) => updateForm('port', event.target.value)}
                  />
                </DialogField>
                <DialogField label="User">
                  <Input
                    className="h-8"
                    placeholder="postgres"
                    value={connectionForm.user}
                    onChange={(event) => updateForm('user', event.target.value)}
                  />
                </DialogField>
                <DialogField label="Password">
                  <Input
                    type="password"
                    className="h-8"
                    placeholder="Password"
                    value={connectionForm.password}
                    onChange={(event) =>
                      updateForm('password', event.target.value)
                    }
                  />
                </DialogField>
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={connectionForm.ssl}
                  onCheckedChange={(checked) =>
                    updateForm('ssl', checked === true)
                  }
                />
                Use SSL
              </label>
            </CollapsibleContent>
          </Collapsible>

          {testData ? (
            <div className="text-muted-foreground text-xs">
              Connected to {testData.database} as {testData.user}.
            </div>
          ) : null}

          {error ? (
            <div className="text-destructive text-xs leading-5">
              {error.message}
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={onTest}
              disabled={testing || saving}
            >
              {testing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Test
            </Button>
            <Button
              type="submit"
              size="sm"
              className="cursor-pointer"
              disabled={testing || saving}
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
