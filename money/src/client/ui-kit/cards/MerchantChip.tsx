import { cn } from '@moldable-ai/ui'
import { categoryColor } from '../lib/colors'

/** Deterministic name → chart-hue index so a merchant is always one color. */
function hashHue(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return categoryColor(h % 5)
}

function monogram(name: string): string {
  const cleaned = name.trim().replace(/^the\s+/i, '')
  const first = cleaned.match(/[A-Za-z0-9]/)
  return (first?.[0] ?? '•').toUpperCase()
}

interface MerchantChipProps {
  name: string
  /** Brand logo URL; falls back to a monogram if missing/broken. */
  logoUrl?: string
  /** Explicit brand color; otherwise a deterministic hue from the name. */
  color?: string
  size?: number
  className?: string
}

/**
 * A 36px rounded-SQUARE brand/app identity chip (squares read as brand, circles
 * read as people). Logo when available, else a monogram on a tinted hue.
 */
export function MerchantChip({
  name,
  logoUrl,
  color,
  size = 36,
  className,
}: MerchantChipProps) {
  const hue = color ?? hashHue(name)
  const radius = Math.round(size * 0.26)

  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden',
        className,
      )}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: logoUrl
          ? 'var(--muted)'
          : `color-mix(in oklch, ${hue} 18%, transparent)`,
      }}
      aria-hidden
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt=""
          className="size-full object-cover"
          loading="lazy"
        />
      ) : (
        <span
          className="font-semibold"
          style={{ color: hue, fontSize: Math.round(size * 0.42) }}
        >
          {monogram(name)}
        </span>
      )}
    </span>
  )
}
