'use client'

import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react'
import { cn } from '@moldable-ai/ui'

/**
 * Inline-editable text that *looks like text*, not a form field. Renders a
 * transparent input styled by the caller; commits on blur / Enter, reverts on
 * Escape. Used for the hero name + scientific name so editing feels like
 * touching the label rather than filling out a form.
 */
export function InlineInput(props: {
  value: string
  placeholder: string
  onCommit: (next: string) => void
  ariaLabel: string
  className?: string
  allowEmpty?: boolean
}): ReactNode {
  const { value, placeholder, onCommit, ariaLabel, className, allowEmpty } =
    props
  const [local, setLocal] = useState(value)
  useEffect(() => setLocal(value), [value])

  const commit = () => {
    const next = local.trim()
    if (!next && !allowEmpty) {
      setLocal(value)
      return
    }
    if (next !== value.trim()) onCommit(next)
    else setLocal(next)
  }

  return (
    <input
      value={local}
      placeholder={placeholder}
      aria-label={ariaLabel}
      spellCheck={false}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          e.currentTarget.blur()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          setLocal(value)
          e.currentTarget.blur()
        }
      }}
      className={cn(
        '-mx-1.5 w-full min-w-0 rounded-lg border border-transparent bg-transparent px-1.5 outline-none transition-colors focus-visible:ring-2',
        className,
      )}
    />
  )
}

/**
 * A small metadata chip that shows a value (or a soft, inviting placeholder)
 * and swaps to a focused input on tap. Empty chips read as gentle invitations
 * ("Add a room") rather than blank required fields.
 */
export function EditableChip(props: {
  icon: ReactNode
  value: string
  placeholder: string
  onCommit: (next: string) => void
  ariaLabel: string
  /** "hero" = legible over a photo; "soft" = on the page surface. */
  variant?: 'hero' | 'soft'
}): ReactNode {
  const {
    icon,
    value,
    placeholder,
    onCommit,
    ariaLabel,
    variant = 'soft',
  } = props
  const [editing, setEditing] = useState(false)
  const [local, setLocal] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => setLocal(value), [value])
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const commit = () => {
    setEditing(false)
    const next = local.trim()
    if (next !== value.trim()) onCommit(next)
  }

  const onHero = variant === 'hero'
  const shellBase =
    'inline-flex h-7 max-w-full items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors [&>svg]:size-3.5 [&>svg]:shrink-0'

  if (editing) {
    return (
      <span
        className={cn(
          shellBase,
          onHero
            ? 'bg-black/45 text-white ring-1 ring-white/30 backdrop-blur'
            : 'bg-muted text-foreground ring-border ring-1',
        )}
      >
        {icon}
        <input
          ref={inputRef}
          value={local}
          placeholder={placeholder}
          aria-label={ariaLabel}
          spellCheck={false}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              e.currentTarget.blur()
            } else if (e.key === 'Escape') {
              e.preventDefault()
              setLocal(value)
              setEditing(false)
            }
          }}
          className={cn(
            'w-28 min-w-0 bg-transparent outline-none placeholder:font-normal',
            onHero
              ? 'placeholder:text-white/55'
              : 'placeholder:text-muted-foreground',
          )}
        />
      </span>
    )
  }

  const empty = !value.trim()
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      aria-label={empty ? placeholder : `${ariaLabel}: ${value}`}
      className={cn(
        shellBase,
        'cursor-pointer',
        onHero
          ? cn(
              'backdrop-blur',
              empty
                ? 'bg-white/10 text-white/70 hover:bg-white/20'
                : 'bg-black/30 text-white/90 hover:bg-black/40',
            )
          : cn(
              empty
                ? 'text-muted-foreground hover:bg-muted hover:text-foreground'
                : 'bg-muted/70 text-foreground hover:bg-muted',
            ),
      )}
    >
      {icon}
      <span className="truncate">{empty ? placeholder : value}</span>
    </button>
  )
}
