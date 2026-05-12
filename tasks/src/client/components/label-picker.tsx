import { Plus, RefreshCcw } from 'lucide-react'
import { useState } from 'react'
import {
  Badge,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
} from '@moldable-ai/ui'
import { AppButton } from './app-button'
import type { TaskLabel } from '@/shared/types'

export function LabelPicker({
  value,
  availableLabels,
  draftLabels,
  disabled = false,
  onChange,
  onDraftLabelsChange,
}: {
  value: string
  availableLabels: TaskLabel[]
  draftLabels: TaskLabel[]
  disabled?: boolean
  onChange: (value: string) => void
  onDraftLabelsChange: (labels: TaskLabel[]) => void
}) {
  const [showCreateLabel, setShowCreateLabel] = useState(false)
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState(() =>
    generateRandomLabelColor(),
  )

  const projectLabels = mergeLabels(availableLabels, draftLabels)
  const selectedNames = splitLabelNames(value)
  const selectedKeys = new Set(selectedNames.map(normalizeLabelName))

  const setSelectedNames = (names: string[]) => {
    onChange(uniqueNames(names).join(', '))
  }

  const toggleLabel = (label: TaskLabel) => {
    const key = normalizeLabelName(label.name)
    if (selectedKeys.has(key)) {
      setSelectedNames(
        selectedNames.filter((name) => normalizeLabelName(name) !== key),
      )
      return
    }
    setSelectedNames([...selectedNames, label.name])
  }

  const handleCreateLabel = () => {
    const name = newLabelName.trim()
    if (!name || newLabelColor.length !== 7) return

    const key = normalizeLabelName(name)
    const existing = projectLabels.find(
      (label) => normalizeLabelName(label.name) === key,
    )

    const label =
      existing ??
      ({
        id: `label-${key.replace(/[^a-z0-9]+/g, '-')}`,
        name,
        color: newLabelColor,
      } satisfies TaskLabel)

    if (!existing) {
      onDraftLabelsChange([...draftLabels, label])
    }

    if (!selectedKeys.has(key)) {
      setSelectedNames([...selectedNames, label.name])
    }

    setNewLabelName('')
    setNewLabelColor(generateRandomLabelColor())
    setShowCreateLabel(false)
  }

  return (
    <div className="flex items-center gap-2 px-4 py-3">
      <span className="text-muted-foreground text-xs">Labels</span>
      <div className="flex flex-wrap gap-1.5">
        {projectLabels.map((label) => {
          const color = getLabelColor(label.color)
          const isSelected = selectedKeys.has(normalizeLabelName(label.name))
          return (
            <button
              key={label.id}
              type="button"
              onClick={() => toggleLabel(label)}
              disabled={disabled}
              className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Badge
                variant="outline"
                className={cn(
                  'text-xs transition-all',
                  !isSelected &&
                    'border-border text-muted-foreground hover:bg-muted bg-transparent',
                )}
                style={
                  isSelected
                    ? {
                        borderColor: color.dot,
                        boxShadow: `0 0 0 2px ${color.dot}40`,
                      }
                    : undefined
                }
              >
                <span
                  className="mr-1.5 size-2 rounded-full"
                  style={{ backgroundColor: color.dot }}
                />
                {label.name}
              </Badge>
            </button>
          )
        })}

        <Popover
          open={showCreateLabel}
          onOpenChange={(open) => {
            setShowCreateLabel(open)
            if (open) setNewLabelColor(generateRandomLabelColor())
          }}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              className="border-border text-muted-foreground hover:border-primary/30 hover:text-foreground mt-1 inline-flex h-6 cursor-pointer items-center gap-1 rounded-full border border-dashed px-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="size-3" />
              New
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72" align="start">
            <div className="space-y-4">
              <div className="text-sm font-medium">Create label</div>

              <div className="bg-muted/50 flex items-center justify-center rounded-md p-4">
                <Badge
                  variant="outline"
                  className="max-w-full truncate text-sm"
                >
                  <span
                    className="mr-1.5 size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: newLabelColor }}
                  />
                  <span className="truncate">
                    {newLabelName || 'Label preview'}
                  </span>
                </Badge>
              </div>

              <div className="space-y-1.5">
                <label className="text-muted-foreground text-xs">Name</label>
                <Input
                  value={newLabelName}
                  onChange={(event) => setNewLabelName(event.target.value)}
                  placeholder="Label name"
                  className="border-border placeholder:text-muted-foreground focus:ring-ring w-full rounded-md border bg-transparent px-3 py-1.5 text-sm focus:outline-none focus:ring-2 dark:bg-transparent"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      handleCreateLabel()
                    }
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-muted-foreground text-xs">Color</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setNewLabelColor(generateRandomLabelColor())}
                    className="border-border hover:bg-muted flex size-9 cursor-pointer items-center justify-center rounded-md border transition-colors"
                    title="Generate random color"
                    style={{ backgroundColor: `${newLabelColor}30` }}
                  >
                    <RefreshCcw
                      className="size-4"
                      style={{ color: newLabelColor }}
                    />
                  </button>
                  <div className="relative flex-1">
                    <span className="text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 text-sm">
                      #
                    </span>
                    <Input
                      value={newLabelColor.replace('#', '')}
                      onChange={(event) => {
                        const color = event.target.value.replace(
                          /[^0-9A-Fa-f]/g,
                          '',
                        )
                        if (color.length <= 6) setNewLabelColor(`#${color}`)
                      }}
                      className="border-border placeholder:text-muted-foreground focus:ring-ring w-full rounded-md border bg-transparent py-1.5 pl-7 pr-3 font-mono text-sm focus:outline-none focus:ring-2 dark:bg-transparent"
                      placeholder="d73a4a"
                      maxLength={6}
                      style={{
                        borderColor:
                          newLabelColor.length === 7
                            ? newLabelColor
                            : undefined,
                      }}
                    />
                  </div>
                </div>
              </div>

              <AppButton
                type="button"
                size="sm"
                onClick={handleCreateLabel}
                disabled={!newLabelName.trim() || newLabelColor.length !== 7}
                className="w-full"
              >
                Create label
              </AppButton>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}

function getLabelColor(hexColor: string) {
  return {
    dot: /^#[0-9A-Fa-f]{6}$/.test(hexColor) ? hexColor : '#6b7280',
  }
}

function generateRandomLabelColor(): string {
  const hue = Math.floor(Math.random() * 360)
  const saturation = 60 + Math.floor(Math.random() * 20)
  const lightness = 45 + Math.floor(Math.random() * 15)
  return hslToHex(hue, saturation, lightness)
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100
  l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

function splitLabelNames(value: string) {
  return uniqueNames(
    value
      .split(',')
      .map((label) => label.trim())
      .filter(Boolean),
  )
}

function uniqueNames(names: string[]) {
  const seen = new Set<string>()
  return names.filter((name) => {
    const key = normalizeLabelName(name)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function mergeLabels(...labelGroups: TaskLabel[][]) {
  const byName = new Map<string, TaskLabel>()
  labelGroups.flat().forEach((label) => {
    const key = normalizeLabelName(label.name)
    if (!byName.has(key)) byName.set(key, label)
  })
  return [...byName.values()]
}

function normalizeLabelName(name: string) {
  return name.trim().toLowerCase()
}
