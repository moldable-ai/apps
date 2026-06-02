'use client'

import {
  BookOpen,
  Droplets,
  Leaf,
  MessageCircle,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Snowflake,
  Sprout,
  Sun,
  Thermometer,
  Wind,
} from 'lucide-react'
import type { JSX, ReactNode } from 'react'
import {
  Button,
  Markdown,
  Spinner,
  cn,
  isInMoldable,
  sendToMoldable,
} from '@moldable-ai/ui'
import type { Plant } from '../../lib/types'

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

function tempLabel(t?: { min?: number; max?: number }): string | null {
  if (!t || (t.min == null && t.max == null)) return null
  if (t.min != null && t.max != null) return `${t.min}–${t.max}°F`
  return t.min != null ? `≥ ${t.min}°F` : `≤ ${t.max}°F`
}

function isToxic(toxicity?: string): boolean {
  if (!toxicity) return false
  const t = toxicity.toLowerCase()
  if (/non-?toxic|pet-?safe|not toxic|safe for/.test(t)) return false
  return /toxic|poison|harmful|irritant|oxalate/.test(t)
}

/** A small uppercase section label, denoting a section without a heavy header. */
function SectionLabel(props: { children: ReactNode }): JSX.Element {
  return (
    <h3 className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.12em]">
      {props.children}
    </h3>
  )
}

/** A soft stat tile — icon, small-caps label, value. No nested boxes-in-boxes. */
function Tile(props: {
  icon: ReactNode
  label: string
  children: ReactNode
  className?: string
  iconClassName?: string
  full?: boolean
}): JSX.Element {
  return (
    <div
      className={cn(
        'bg-muted/40 rounded-xl p-3',
        props.full && 'col-span-2',
        props.className,
      )}
    >
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            'text-muted-foreground [&>svg]:size-3.5',
            props.iconClassName,
          )}
        >
          {props.icon}
        </span>
        <span className="text-muted-foreground text-[10.5px] font-semibold uppercase tracking-[0.08em]">
          {props.label}
        </span>
      </div>
      <div className="text-foreground mt-1 text-[13px] leading-snug">
        {props.children}
      </div>
    </div>
  )
}

function GuideBlock(props: {
  icon: ReactNode
  title: string
  children: ReactNode
}): JSX.Element {
  return (
    <div className="flex gap-2.5">
      <span className="text-muted-foreground mt-0.5 shrink-0">
        {props.icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-muted-foreground text-[10.5px] font-semibold uppercase tracking-[0.08em]">
          {props.title}
        </div>
        <div className="text-foreground/90 mt-0.5 text-[13px] leading-relaxed">
          {props.children}
        </div>
      </div>
    </div>
  )
}

/**
 * Care at a glance — the AI profile as a calm grid of stat tiles, then plainly
 * sectioned (no collapses): the full guide, and a troubleshooting section.
 */
export function CareView(props: {
  plant: Plant
  onRegenerate: () => void
  generating: boolean
}): JSX.Element {
  const { plant, onRegenerate, generating } = props
  const care = plant.care

  const hasCare =
    !!care &&
    (care.summary ||
      care.light ||
      care.humidity ||
      care.temperatureF ||
      care.soil ||
      care.feeding ||
      care.toxicity ||
      (care.commonProblems && care.commonProblems.length > 0) ||
      care.careMarkdown)

  // ── Generating: a living aurora while the plan grows ──
  if (generating && !hasCare) {
    return (
      <div className="plant-aurora flex min-h-[8.5rem] flex-col items-center justify-center gap-2 rounded-2xl p-6 text-center">
        <Sprout className="size-6 text-white/90 drop-shadow" />
        <p className="text-sm font-medium text-white drop-shadow">
          Growing your care plan…
        </p>
        <p className="max-w-xs text-xs text-white/80 drop-shadow">
          Watering, light, feeding and more — tailored to this plant.
        </p>
      </div>
    )
  }

  // ── Empty: an inviting CTA, not a dead end ──
  if (!hasCare) {
    return (
      <div className="bg-card flex flex-col items-center gap-3 rounded-2xl border border-dashed p-6 text-center">
        <span className="bg-muted text-muted-foreground grid size-11 place-items-center rounded-full">
          <BookOpen className="size-5" />
        </span>
        <div>
          <p className="text-foreground text-sm font-medium">
            Add a care guide
          </p>
          <p className="text-muted-foreground mx-auto mt-1 max-w-xs text-xs leading-relaxed">
            Get a watering rhythm, light, feeding and more — generated from this
            plant&apos;s name.
          </p>
        </div>
        <Button
          onClick={onRegenerate}
          disabled={generating}
          className="cursor-pointer gap-1.5"
        >
          {generating ? (
            <Spinner className="size-4" />
          ) : (
            <BookOpen className="size-4" />
          )}
          Generate care
        </Button>
      </div>
    )
  }

  const temp = tempLabel(care?.temperatureF)
  const toxic = isToxic(care?.toxicity)
  const generatedAt = formatDate(care?.generatedAt)
  const feeding = care?.feeding
  const feedingValue =
    feeding &&
    (feeding.intervalDays != null || feeding.fertilizer || feeding.season)
      ? [
          feeding.intervalDays != null
            ? `Every ${feeding.intervalDays} ${feeding.intervalDays === 1 ? 'day' : 'days'}`
            : null,
          feeding.fertilizer,
          feeding.season,
        ]
          .filter(Boolean)
          .join(' · ')
      : null

  const waterDetail = [
    care?.water?.amountMl != null ? `${care.water.amountMl} ml` : null,
    care?.water?.method,
    care?.water?.notes,
  ]
    .filter(Boolean)
    .join(' — ')
  const hasGuide = !!care?.careMarkdown || !!waterDetail || !!feeding?.notes

  const problems = care?.commonProblems ?? []
  const canAsk = isInMoldable()
  const showTroubleshoot = problems.length > 0 || canAsk

  return (
    <div className="space-y-4">
      {/* Care guide — summary + glanceable tiles */}
      <section>
        <div className="flex items-center justify-between">
          <SectionLabel>Care guide</SectionLabel>
          <button
            type="button"
            onClick={onRegenerate}
            disabled={generating}
            className="text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center gap-1 text-xs disabled:opacity-60"
            aria-label="Regenerate care guide"
          >
            {generating ? (
              <Spinner className="size-3.5" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            Regenerate
          </button>
        </div>

        {care?.summary && (
          <p className="text-foreground/90 plant-serif mb-3 mt-2 text-[15px] leading-relaxed">
            {care.summary}
          </p>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2">
          {care?.light && (
            <Tile
              icon={<Sun />}
              label="Light"
              iconClassName="text-amber-500/80"
            >
              {care.light}
            </Tile>
          )}
          {temp && (
            <Tile icon={<Thermometer />} label="Temperature">
              {temp}
            </Tile>
          )}
          {care?.humidity && (
            <Tile icon={<Wind />} label="Humidity">
              {care.humidity}
            </Tile>
          )}
          {care?.soil && (
            <Tile icon={<Sprout />} label="Soil">
              {care.soil}
            </Tile>
          )}
          {feedingValue && (
            <Tile
              icon={<Leaf />}
              label="Feeding"
              iconClassName="text-[oklch(0.62_0.14_150)]"
            >
              {feedingValue}
            </Tile>
          )}
          {care?.dormancy && (
            <Tile
              icon={<Snowflake />}
              label="Dormancy"
              iconClassName="text-sky-400/80"
            >
              {care.dormancy}
            </Tile>
          )}
          {care?.toxicity && (
            <Tile
              icon={toxic ? <ShieldAlert /> : <ShieldCheck />}
              label={toxic ? 'Toxic' : 'Pet-safe'}
              full
              className={cn(
                toxic
                  ? 'bg-[oklch(0.72_0.15_60_/_0.12)]'
                  : 'bg-[oklch(0.72_0.14_152_/_0.10)]',
              )}
              iconClassName={
                toxic
                  ? 'text-[oklch(0.72_0.16_60)]'
                  : 'text-[oklch(0.66_0.15_152)]'
              }
            >
              {care.toxicity}
            </Tile>
          )}
        </div>
      </section>

      {/* Full guide — always visible, clearly sectioned */}
      {hasGuide && (
        <section className="border-border/50 border-t pt-4">
          <SectionLabel>Full guide</SectionLabel>
          <div className="mt-2.5 space-y-3">
            {waterDetail && (
              <GuideBlock
                icon={<Droplets className="size-3.5" />}
                title="Watering"
              >
                {waterDetail}
              </GuideBlock>
            )}
            {feeding?.notes && (
              <GuideBlock icon={<Leaf className="size-3.5" />} title="Feeding">
                {feeding.notes}
              </GuideBlock>
            )}
            {care?.careMarkdown && (
              <div
                className={cn(
                  (waterDetail || feeding?.notes) &&
                    'border-border/50 border-t pt-3',
                )}
              >
                <Markdown markdown={care.careMarkdown} proseSize="sm" />
              </div>
            )}
          </div>
        </section>
      )}

      {/* Troubleshooting — what to look for, and a way to get help */}
      {showTroubleshoot && (
        <Troubleshoot plant={plant} problems={problems} canAsk={canAsk} />
      )}

      {generatedAt && (
        <p className="text-muted-foreground/70 text-[11px]">
          Generated {generatedAt}
          {care?.model ? ` · ${care.model}` : ''}
        </p>
      )}
    </div>
  )
}

/**
 * Reassurance path — the feeling that haunts plant owners is "am I killing it?".
 * Lists this plant's common problems and offers a one-tap handoff to the
 * (vision-capable) desktop assistant, pre-seeded with the plant's identity.
 */
function Troubleshoot(props: {
  plant: Plant
  problems: string[]
  canAsk: boolean
}): JSX.Element {
  const { plant, problems, canAsk } = props

  const askAssistant = () => {
    const sci = plant.scientificName ? ` (${plant.scientificName})` : ''
    const where = plant.room ? ` in the ${plant.room}` : ''
    sendToMoldable({
      type: 'moldable:set-chat-instructions',
      text:
        `You are helping diagnose a house plant in the Plants app. The user is looking at "${plant.commonName}"${sci}${where} (id: ${plant.id}). ` +
        `Ask what they're seeing (or look at a photo they share), give the most likely cause and a concrete fix, and if the watering rhythm should change adjust it with the Plants RPC plants.update { id, waterIntervalDays } or regenerate the guide with plants.generateCare { id }.`,
    })
    sendToMoldable({
      type: 'moldable:set-chat-input',
      text: `My ${plant.commonName} isn't looking great — `,
    })
  }

  return (
    <section className="border-border/50 border-t pt-4">
      <SectionLabel>Troubleshooting</SectionLabel>
      {problems.length > 0 && (
        <ul className="mt-2.5 space-y-1.5">
          {problems.map((p, i) => (
            <li
              key={i}
              className="text-foreground/90 flex gap-2 text-[13px] leading-relaxed"
            >
              <span className="text-muted-foreground mt-px">·</span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      )}
      {canAsk && (
        <Button
          type="button"
          variant="outline"
          onClick={askAssistant}
          className="mt-3 h-9 w-full cursor-pointer gap-1.5 rounded-lg text-[13px]"
        >
          <MessageCircle className="size-4" />
          Ask the assistant about a problem
        </Button>
      )}
    </section>
  )
}
