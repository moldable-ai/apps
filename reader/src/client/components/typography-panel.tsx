import { Minus, Monitor, Plus } from 'lucide-react'
import {
  Label,
  ScrollArea,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Slider,
  Switch,
  ToggleGroup,
  ToggleGroupItem,
  cn,
  useTheme,
} from '@moldable-ai/ui'
import {
  type ConcreteReaderTheme,
  READER_CONTENT_WIDTH,
  READER_FONT_SIZE,
  READER_FONT_STACKS,
  READER_LINE_HEIGHT,
  READER_THEMES,
  type ReaderFont,
  type ReaderLayout,
  type ReaderSettings,
  resolveReaderTheme,
} from '../../shared/reader-settings'

interface TypographyPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: ReaderSettings
  update: (patch: Partial<ReaderSettings>) => void
}

const FONTS: { value: ReaderFont; label: string }[] = [
  { value: 'serif', label: 'Serif' },
  { value: 'sans', label: 'Sans' },
  { value: 'mono', label: 'Mono' },
  { value: 'dyslexic', label: 'Dyslexic' },
]

const THEME_KEYS: ConcreteReaderTheme[] = [
  'paper',
  'sepia',
  'slate',
  'dark',
  'night',
]

const LAYOUTS: { value: ReaderLayout; label: string }[] = [
  { value: 'paginated', label: 'Paged' },
  { value: 'scroll', label: 'Scroll' },
]

function Row({
  label,
  value,
  children,
}: {
  label: string
  value?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          {label}
        </Label>
        {value ? (
          <span className="text-muted-foreground text-xs tabular-nums">
            {value}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  )
}

export function TypographyPanel({
  open,
  onOpenChange,
  settings,
  update,
}: TypographyPanelProps) {
  const { resolvedTheme } = useTheme()
  const mode = resolvedTheme === 'dark' ? 'dark' : 'light'
  const systemColors = resolveReaderTheme('system', mode)

  const adjustFontSize = (delta: number) => {
    const next = Math.min(
      READER_FONT_SIZE.max,
      Math.max(READER_FONT_SIZE.min, settings.fontSize + delta),
    )
    if (next !== settings.fontSize) update({ fontSize: next })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full max-w-sm flex-col gap-0 p-0"
        style={{ maxHeight: '100dvh' }}
      >
        <SheetHeader className="border-border border-b px-5 py-4">
          <SheetTitle>Typography</SheetTitle>
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-6 px-5 py-5 pb-[calc(var(--chat-safe-padding,0px)+1.5rem)]">
            <Row label="Typeface">
              <ToggleGroup
                type="single"
                value={settings.font}
                onValueChange={(value) => {
                  if (value) update({ font: value as ReaderFont })
                }}
                className="grid w-full grid-cols-2 gap-1"
                variant="outline"
              >
                {FONTS.map((font) => (
                  <ToggleGroupItem
                    key={font.value}
                    value={font.value}
                    aria-label={font.label}
                    className="cursor-pointer"
                    style={{ fontFamily: READER_FONT_STACKS[font.value] }}
                  >
                    {font.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Row>

            <Row label="Theme">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => update({ theme: 'system' })}
                  aria-label="System (match app light or dark mode)"
                  aria-pressed={settings.theme === 'system'}
                  title="System"
                  className={cn(
                    'ring-offset-background flex size-10 flex-1 cursor-pointer items-center justify-center rounded-md border transition-shadow',
                    settings.theme === 'system'
                      ? 'ring-ring ring-2 ring-offset-2'
                      : 'hover:opacity-90',
                  )}
                  style={{
                    backgroundColor: systemColors.bg,
                    color: systemColors.fg,
                    borderColor: systemColors.muted,
                  }}
                >
                  <Monitor className="size-4" aria-hidden />
                </button>
                {THEME_KEYS.map((key) => {
                  const theme = READER_THEMES[key]
                  const active = settings.theme === key
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => update({ theme: key })}
                      aria-label={theme.label}
                      aria-pressed={active}
                      title={theme.label}
                      className={cn(
                        'ring-offset-background flex size-10 flex-1 cursor-pointer items-center justify-center rounded-md border text-sm font-medium transition-shadow',
                        active
                          ? 'ring-ring ring-2 ring-offset-2'
                          : 'hover:opacity-90',
                      )}
                      style={{
                        backgroundColor: theme.bg,
                        color: theme.fg,
                        borderColor: theme.muted,
                      }}
                    >
                      Aa
                    </button>
                  )
                })}
              </div>
            </Row>

            <Row label="Text size" value={`${settings.fontSize}px`}>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => adjustFontSize(-READER_FONT_SIZE.step)}
                  disabled={settings.fontSize <= READER_FONT_SIZE.min}
                  aria-label="Decrease text size"
                  className="border-border bg-background hover:bg-muted flex size-9 cursor-pointer items-center justify-center rounded-md border disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Minus className="size-4" aria-hidden />
                </button>
                <div className="bg-muted/50 flex h-9 flex-1 items-center justify-center rounded-md text-sm tabular-nums">
                  {settings.fontSize}px
                </div>
                <button
                  type="button"
                  onClick={() => adjustFontSize(READER_FONT_SIZE.step)}
                  disabled={settings.fontSize >= READER_FONT_SIZE.max}
                  aria-label="Increase text size"
                  className="border-border bg-background hover:bg-muted flex size-9 cursor-pointer items-center justify-center rounded-md border disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus className="size-4" aria-hidden />
                </button>
              </div>
            </Row>

            <Row label="Line height" value={settings.lineHeight.toFixed(2)}>
              <Slider
                value={[settings.lineHeight]}
                min={READER_LINE_HEIGHT.min}
                max={READER_LINE_HEIGHT.max}
                step={READER_LINE_HEIGHT.step}
                onValueChange={(value) => {
                  const next = value[0]
                  if (typeof next === 'number') update({ lineHeight: next })
                }}
              />
            </Row>

            <Row label="Content width" value={`${settings.contentWidth}px`}>
              <Slider
                value={[settings.contentWidth]}
                min={READER_CONTENT_WIDTH.min}
                max={READER_CONTENT_WIDTH.max}
                step={READER_CONTENT_WIDTH.step}
                onValueChange={(value) => {
                  const next = value[0]
                  if (typeof next === 'number') update({ contentWidth: next })
                }}
              />
            </Row>

            <div className="flex items-center justify-between">
              <Label
                htmlFor="reader-justify"
                className="text-muted-foreground cursor-pointer text-xs font-medium uppercase tracking-wide"
              >
                Justify text
              </Label>
              <Switch
                id="reader-justify"
                checked={settings.justify}
                onCheckedChange={(checked) => update({ justify: checked })}
                className="cursor-pointer"
              />
            </div>

            <Row label="Layout">
              <ToggleGroup
                type="single"
                value={settings.layout}
                onValueChange={(value) => {
                  if (value) update({ layout: value as ReaderLayout })
                }}
                className="w-full"
                variant="outline"
              >
                {LAYOUTS.map((layout) => (
                  <ToggleGroupItem
                    key={layout.value}
                    value={layout.value}
                    aria-label={layout.label}
                    className="flex-1 cursor-pointer"
                  >
                    {layout.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Row>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
