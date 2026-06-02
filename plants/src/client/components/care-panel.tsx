'use client'

import {
  Droplets,
  Leaf,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Sprout,
  Sun,
  Thermometer,
  TriangleAlert,
  Wind,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Button, Markdown, Separator, Spinner, cn } from '@moldable-ai/ui'
import { type Plant, nextDueAt } from '../../lib/types'

// ---------------------------------------------------------------------------
// A single labelled row. Compact, no nested cards — just an icon, a label and
// the value. Used for every care attribute.
// ---------------------------------------------------------------------------

function CareRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex gap-3 py-2.5">
      <div className="text-muted-foreground mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          {label}
        </div>
        <div className="text-foreground mt-0.5 text-sm leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  )
}

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function relativeDay(iso: string | null): string | null {
  if (!iso) return null
  const due = new Date(iso).getTime()
  if (Number.isNaN(due)) return null
  const days = Math.round((due - Date.now()) / (24 * 60 * 60 * 1000))
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days === -1) return 'yesterday'
  if (days < 0) return `${Math.abs(days)} days ago`
  return `in ${days} days`
}

export function CarePanel(props: {
  plant: Plant
  onRegenerate: () => void
  regenerating: boolean
}) {
  const { plant, onRegenerate, regenerating } = props
  const care = plant.care

  const interval = plant.waterIntervalDays ?? care?.water?.intervalDays
  const due = nextDueAt(plant)
  const dueLabel = relativeDay(due)

  const hasCare =
    !!care &&
    (care.summary ||
      care.light ||
      care.water ||
      care.humidity ||
      care.temperatureF ||
      care.soil ||
      care.feeding ||
      care.toxicity ||
      (care.commonProblems && care.commonProblems.length > 0) ||
      care.careMarkdown)

  // ----- Empty state: no care generated yet -----
  if (!hasCare) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
        <div className="bg-muted text-muted-foreground flex size-11 items-center justify-center rounded-full">
          <Sparkles className="size-5" />
        </div>
        <div>
          <p className="text-foreground text-sm font-medium">
            No care guide yet
          </p>
          <p className="text-muted-foreground mt-1 max-w-xs text-xs leading-relaxed">
            Generate a watering schedule and care notes from this plant&apos;s
            name and conditions.
          </p>
        </div>
        <Button
          size="sm"
          onClick={onRegenerate}
          disabled={regenerating}
          className="cursor-pointer"
        >
          {regenerating ? (
            <Spinner className="mr-1.5 size-3.5" />
          ) : (
            <Sparkles className="mr-1.5 size-3.5" />
          )}
          Generate care
        </Button>
      </div>
    )
  }

  const temp = care?.temperatureF
  const tempLabel =
    temp && (temp.min != null || temp.max != null)
      ? temp.min != null && temp.max != null
        ? `${temp.min}–${temp.max}°F`
        : temp.min != null
          ? `≥ ${temp.min}°F`
          : `≤ ${temp.max}°F`
      : null

  const generatedAt = formatDate(care?.generatedAt)

  return (
    <div className="space-y-1">
      {/* Header with regenerate affordance */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-foreground text-sm font-semibold">Care</h3>
          {care?.summary && (
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
              {care.summary}
            </p>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={onRegenerate}
          disabled={regenerating}
          className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
          aria-label="Regenerate care guide"
        >
          {regenerating ? (
            <Spinner className="mr-1.5 size-3.5" />
          ) : (
            <RefreshCw className="mr-1.5 size-3.5" />
          )}
          Regenerate
        </Button>
      </div>

      <Separator className="my-1" />

      <div className="divide-border divide-y">
        {/* Watering */}
        {(interval != null || care?.water) && (
          <CareRow icon={<Droplets className="size-4" />} label="Watering">
            <div className="space-y-0.5">
              <div>
                {interval != null
                  ? `Every ${interval} ${interval === 1 ? 'day' : 'days'}`
                  : 'Schedule not set'}
                {care?.water?.amountMl != null && (
                  <span className="text-muted-foreground">
                    {' '}
                    · {care.water.amountMl} ml
                  </span>
                )}
              </div>
              {dueLabel && (
                <div
                  className={cn(
                    'text-xs',
                    due && new Date(due).getTime() < Date.now()
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground',
                  )}
                >
                  Next due {dueLabel}
                </div>
              )}
              {care?.water?.method && (
                <div className="text-muted-foreground text-xs">
                  {care.water.method}
                </div>
              )}
              {care?.water?.notes && (
                <div className="text-muted-foreground text-xs leading-relaxed">
                  {care.water.notes}
                </div>
              )}
            </div>
          </CareRow>
        )}

        {/* Light */}
        {care?.light && (
          <CareRow icon={<Sun className="size-4" />} label="Light">
            {care.light}
          </CareRow>
        )}

        {/* Humidity */}
        {care?.humidity && (
          <CareRow icon={<Wind className="size-4" />} label="Humidity">
            {care.humidity}
          </CareRow>
        )}

        {/* Temperature */}
        {tempLabel && (
          <CareRow
            icon={<Thermometer className="size-4" />}
            label="Temperature"
          >
            {tempLabel}
          </CareRow>
        )}

        {/* Soil */}
        {care?.soil && (
          <CareRow icon={<Sprout className="size-4" />} label="Soil">
            {care.soil}
          </CareRow>
        )}

        {/* Feeding */}
        {care?.feeding &&
          (care.feeding.intervalDays != null ||
            care.feeding.fertilizer ||
            care.feeding.season ||
            care.feeding.notes) && (
            <CareRow icon={<Leaf className="size-4" />} label="Feeding">
              <div className="space-y-0.5">
                {care.feeding.intervalDays != null && (
                  <div>
                    Every {care.feeding.intervalDays}{' '}
                    {care.feeding.intervalDays === 1 ? 'day' : 'days'}
                  </div>
                )}
                {care.feeding.fertilizer && (
                  <div className="text-muted-foreground text-xs">
                    {care.feeding.fertilizer}
                  </div>
                )}
                {care.feeding.season && (
                  <div className="text-muted-foreground text-xs">
                    {care.feeding.season}
                  </div>
                )}
                {care.feeding.notes && (
                  <div className="text-muted-foreground text-xs leading-relaxed">
                    {care.feeding.notes}
                  </div>
                )}
              </div>
            </CareRow>
          )}

        {/* Toxicity */}
        {care?.toxicity && (
          <CareRow icon={<ShieldAlert className="size-4" />} label="Toxicity">
            {care.toxicity}
          </CareRow>
        )}

        {/* Common problems */}
        {care?.commonProblems && care.commonProblems.length > 0 && (
          <CareRow
            icon={<TriangleAlert className="size-4" />}
            label="Common problems"
          >
            <ul className="space-y-1">
              {care.commonProblems.map((p, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-muted-foreground">·</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </CareRow>
        )}
      </div>

      {/* Longer prose care guide */}
      {care?.careMarkdown && (
        <div className="pt-3">
          <Separator className="mb-3" />
          <Markdown markdown={care.careMarkdown} proseSize="sm" />
        </div>
      )}

      {/* Provenance */}
      {generatedAt && (
        <p className="text-muted-foreground pt-3 text-xs">
          Generated {generatedAt}
          {care?.model ? ` · ${care.model}` : ''}
        </p>
      )}
    </div>
  )
}
