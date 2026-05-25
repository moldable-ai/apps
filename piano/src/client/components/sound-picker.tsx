import { Check, ChevronDown, Download, Loader2, Music2 } from 'lucide-react'
import type { MouseEvent } from 'react'
import { useState } from 'react'
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
} from '@moldable-ai/ui'
import type { PianoInstrumentPack } from '../../shared/audio'

interface SoundPickerProps {
  packs: PianoInstrumentPack[]
  activePackId: string | null
  activeInstrumentId: string | null
  onActiveInstrumentChange: (packId: string, instrumentId: string) => void
  onInstallPack?: (packId: string) => Promise<void>
  installingPackIds?: Set<string>
  isLoading?: boolean
  align?: 'start' | 'center' | 'end'
}

const ACTIVE_PACK_STORAGE_KEY = 'piano:active-pack'
const ACTIVE_INSTRUMENT_STORAGE_KEY = 'piano:active-instrument'

export function readActivePackId(): string | null {
  try {
    return window.localStorage.getItem(ACTIVE_PACK_STORAGE_KEY)
  } catch {
    return null
  }
}

export function writeActivePackId(id: string) {
  try {
    window.localStorage.setItem(ACTIVE_PACK_STORAGE_KEY, id)
  } catch {
    // ignore storage failure
  }
}

export function readActiveInstrumentId(): string | null {
  try {
    return window.localStorage.getItem(ACTIVE_INSTRUMENT_STORAGE_KEY)
  } catch {
    return null
  }
}

export function writeActiveInstrumentId(id: string) {
  try {
    window.localStorage.setItem(ACTIVE_INSTRUMENT_STORAGE_KEY, id)
  } catch {
    // ignore storage failure
  }
}

function formatSize(mb?: number) {
  if (mb === undefined) return ''
  if (mb < 1024) return `${Math.round(mb)} MB`
  return `${(mb / 1024).toFixed(1)} GB`
}

export function SoundPicker({
  packs,
  activePackId,
  activeInstrumentId,
  onActiveInstrumentChange,
  onInstallPack,
  installingPackIds = new Set(),
  isLoading = false,
  align = 'end',
}: SoundPickerProps) {
  const [open, setOpen] = useState(false)
  const [installError, setInstallError] = useState<string | null>(null)

  const activePack =
    packs.find((p) => p.id === activePackId) ??
    packs.find((p) => p.status === 'installed') ??
    packs[0]
  const activeInstrument =
    activePack?.instruments.find(
      (instrument) =>
        instrument.id === activeInstrumentId && instrument.playable,
    ) ??
    activePack?.instruments.find((instrument) => instrument.playable) ??
    null
  const triggerLabel =
    activePack &&
    activePack.instruments.filter((instrument) => instrument.playable).length >
      1
      ? (activeInstrument?.name ?? activePack.name)
      : (activePack?.name ?? 'Piano sound')

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'border-border/50 bg-muted/15 hover:bg-muted/30 inline-flex h-7 max-w-[180px] cursor-pointer items-center gap-1.5 rounded-full border pl-2 pr-1.5 text-[11.5px] font-medium transition-colors',
          )}
          aria-label="Piano sound"
        >
          <Music2 className="size-3 shrink-0" />
          <span className="truncate">{triggerLabel}</span>
          <ChevronDown className="size-3 shrink-0 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        side="bottom"
        sideOffset={8}
        className="w-[340px] p-0"
      >
        <div className="px-3 pb-1.5 pt-3">
          <p className="text-muted-foreground/80 text-[10px] font-medium uppercase tracking-[0.16em]">
            Piano sound
          </p>
        </div>

        <div className="max-h-[320px] overflow-y-auto px-1.5 pb-1.5">
          {isLoading ? (
            <div className="text-muted-foreground flex h-24 items-center justify-center text-xs">
              <Loader2 className="mr-2 size-3.5 animate-spin" />
              Loading…
            </div>
          ) : (
            packs.map((pack) => {
              const isActive = pack.id === activePack?.id
              const isInstalled = pack.status === 'installed'
              const playableInstruments = pack.instruments.filter(
                (instrument) => instrument.playable,
              )
              const isPlayable = isInstalled && playableInstruments.length > 0
              const selectedInstrument =
                playableInstruments.find(
                  (instrument) => instrument.id === activeInstrumentId,
                ) ?? playableInstruments[0]
              const showInstrumentChoices =
                isActive &&
                isPlayable &&
                playableInstruments.length > 1 &&
                Boolean(selectedInstrument)

              const handleSelect = () => {
                if (!isInstalled || !isPlayable || !selectedInstrument) return
                onActiveInstrumentChange(pack.id, selectedInstrument.id)
                if (playableInstruments.length <= 1) setOpen(false)
              }

              const isInstalling = installingPackIds.has(pack.id)

              const handleInstall = async (
                event: MouseEvent<HTMLButtonElement>,
              ) => {
                event.stopPropagation()
                if (!onInstallPack || isInstalling) return
                setInstallError(null)
                try {
                  await onInstallPack(pack.id)
                  setOpen(false)
                } catch (error) {
                  setInstallError(
                    error instanceof Error
                      ? error.message
                      : `Failed to install ${pack.name}`,
                  )
                }
              }

              return (
                <div key={pack.id}>
                  <button
                    type="button"
                    onClick={handleSelect}
                    className={cn(
                      'flex w-full items-start gap-2.5 rounded-md px-2 py-2 text-left transition-colors focus:outline-none focus-visible:outline-none',
                      isInstalled && isPlayable
                        ? 'hover:bg-muted/55 cursor-pointer'
                        : 'cursor-default',
                    )}
                  >
                    <div
                      className={cn(
                        'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors',
                        isActive
                          ? 'border-foreground bg-foreground text-background'
                          : 'border-border/70',
                      )}
                    >
                      {isActive ? (
                        <Check className="size-2.5" strokeWidth={3} />
                      ) : null}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[12.5px] font-medium leading-4">
                          {pack.name}
                        </span>
                        <span className="text-muted-foreground/70 piano-mono text-[10px]">
                          {formatSize(pack.sizeMb)}
                        </span>
                      </div>
                      <p className="text-muted-foreground line-clamp-1 text-[10.5px] leading-4">
                        {pack.developer}
                      </p>
                    </div>

                    {isInstalled ? (
                      <span className="text-muted-foreground/70 piano-mono mt-0.5 shrink-0 text-[10px]">
                        Installed
                      </span>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 shrink-0 cursor-pointer rounded-full px-2 text-[10.5px]"
                        disabled={isInstalling}
                        onClick={handleInstall}
                      >
                        {isInstalling ? (
                          <Loader2 className="mr-1 size-3 animate-spin" />
                        ) : (
                          <Download className="mr-1 size-3" />
                        )}
                        {isInstalling ? 'Installing' : 'Install'}
                      </Button>
                    )}
                  </button>

                  {showInstrumentChoices ? (
                    <div className="border-border/40 -mt-0.5 mb-1 ml-6 space-y-0.5 border-l pl-2">
                      {playableInstruments.map((instrument) => {
                        const isInstrumentActive =
                          isActive && instrument.id === selectedInstrument.id
                        return (
                          <button
                            key={instrument.id}
                            type="button"
                            onClick={() => {
                              onActiveInstrumentChange(pack.id, instrument.id)
                              setOpen(false)
                            }}
                            className={cn(
                              'flex h-7 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-left text-[11px] transition-colors',
                              isInstrumentActive
                                ? 'bg-muted/65 text-foreground'
                                : 'text-muted-foreground hover:bg-muted/45 hover:text-foreground',
                            )}
                          >
                            <Check
                              className={cn(
                                'size-3 shrink-0',
                                isInstrumentActive
                                  ? 'opacity-100'
                                  : 'opacity-0',
                              )}
                              strokeWidth={3}
                            />
                            <span className="min-w-0 flex-1 truncate">
                              {instrument.name}
                            </span>
                            <span className="text-muted-foreground/55 piano-mono shrink-0 text-[9.5px] capitalize">
                              {instrument.type}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
              )
            })
          )}
        </div>

        {installError ? (
          <div className="border-destructive/30 bg-destructive/10 text-destructive border-t px-3 py-2 text-[10px] leading-4">
            {installError}
          </div>
        ) : null}

        {activePack && activePack.license.attributionRequired ? (
          <div className="border-border/50 bg-muted/15 text-muted-foreground border-t px-3 py-2 text-[10px] leading-4">
            Samples by {activePack.attribution.author}
            {activePack.license.url ? (
              <>
                {' · '}
                <a
                  href={activePack.license.url}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-foreground underline-offset-2 hover:underline"
                >
                  {activePack.license.name}
                </a>
              </>
            ) : (
              ` · ${activePack.license.name}`
            )}
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
