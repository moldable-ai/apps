import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@moldable-ai/ui'

interface Candidate {
  name: string
  kind: 'collection' | 'method' | 'function'
  insert: string
  /** Cursor offset from the start of the inserted text. */
  caret: number
}

interface FormulaInputProps {
  value: string
  onChange: (next: string) => void
  onRun: () => void
  collections: string[]
  methods: string[]
  functions: string[]
  placeholder?: string
}

const KIND_LABEL: Record<Candidate['kind'], string> = {
  collection: 'collection',
  method: 'method',
  function: 'fn',
}

// Style props copied onto the mirror div so wrapped caret math matches the textarea.
const CARET_PROPS = [
  'boxSizing',
  'width',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'fontStyle',
  'fontVariant',
  'fontWeight',
  'fontStretch',
  'fontSize',
  'lineHeight',
  'fontFamily',
  'textAlign',
  'textTransform',
  'textIndent',
  'letterSpacing',
  'wordSpacing',
  'tabSize',
  'whiteSpace',
  'wordWrap',
  'wordBreak',
  'overflowWrap',
] as const

/**
 * Pixel position of the caret within a textarea, via a hidden mirror div that
 * replicates the textarea's box + text wrapping (the standard technique).
 */
function caretCoords(el: HTMLTextAreaElement, position: number) {
  const div = document.createElement('div')
  const computed = getComputedStyle(el)
  const style = div.style as unknown as Record<string, string>
  style.position = 'absolute'
  style.visibility = 'hidden'
  style.whiteSpace = 'pre-wrap'
  style.wordWrap = 'break-word'
  const src = computed as unknown as Record<string, string>
  for (const prop of CARET_PROPS) style[prop] = src[prop]
  div.textContent = el.value.slice(0, position)
  const span = document.createElement('span')
  span.textContent = el.value.slice(position) || '.'
  div.appendChild(span)
  document.body.appendChild(div)
  const coords = {
    left: span.offsetLeft,
    top: span.offsetTop,
    height: parseFloat(computed.lineHeight) || 18,
  }
  document.body.removeChild(div)
  return coords
}

/** Trailing identifier before the caret + whether it follows a `.` (method ctx). */
function tokenContext(text: string, caret: number) {
  const before = text.slice(0, caret)
  const match = before.match(/([A-Za-z_][A-Za-z0-9_]*)$/)
  const token = match ? match[1] : ''
  const tokenStart = caret - token.length
  const afterDot = before.slice(0, tokenStart).endsWith('.')
  return { token, tokenStart, afterDot }
}

/**
 * A formula textarea with a lightweight, schema-driven autocomplete. After a
 * `.` it suggests collection methods; otherwise collections + domain functions.
 * Keyboard: ↑/↓ to move, ⏎/⇥ to accept, Esc to dismiss, ⌘/Ctrl+⏎ to run.
 *
 * This is purely client-side off the formula schema. A richer, context-aware
 * backend completion endpoint (valid next-methods by value type, field names,
 * enum values) is requested in CLAUDE.md.
 */
export function FormulaInput({
  value,
  onChange,
  onRun,
  collections,
  methods,
  functions,
  placeholder,
}: FormulaInputProps) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const pendingCaret = useRef<number | null>(null)
  const [caret, setCaret] = useState(value.length)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [coords, setCoords] = useState({ left: 0, top: 22 })

  const { token, tokenStart, afterDot } = tokenContext(value, caret)

  const candidates = useMemo<Candidate[]>(() => {
    const pool: Candidate[] = afterDot
      ? methods.map((n) => ({
          name: n,
          kind: 'method',
          insert: `${n}()`,
          caret: n.length + 1,
        }))
      : [
          ...collections.map((n) => ({
            name: n,
            kind: 'collection' as const,
            insert: n,
            caret: n.length,
          })),
          ...functions.map((n) => ({
            name: n,
            kind: 'function' as const,
            insert: `${n}()`,
            caret: n.length + 1,
          })),
        ]
    // After a dot, show all methods even with an empty token; otherwise require
    // at least one typed character so the dropdown isn't noisy.
    if (!afterDot && token.length === 0) return []
    const q = token.toLowerCase()
    const starts = pool.filter((c) => c.name.toLowerCase().startsWith(q))
    const ranked = q ? starts : pool
    return ranked.slice(0, 8)
  }, [afterDot, token, collections, methods, functions])

  const showDropdown = open && candidates.length > 0
  // Don't show a single exact match (nothing to complete).
  const onlyExact =
    candidates.length === 1 &&
    candidates[0].name.toLowerCase() === token.toLowerCase()

  useEffect(() => {
    setActive(0)
  }, [token, afterDot])

  // Apply a pending caret position after an accept re-renders the value.
  useLayoutEffect(() => {
    if (pendingCaret.current != null && ref.current) {
      const pos = pendingCaret.current
      ref.current.setSelectionRange(pos, pos)
      setCaret(pos)
      pendingCaret.current = null
    }
  }, [value])

  // Anchor the dropdown to the caret (token start), clamped within the input.
  useLayoutEffect(() => {
    if (!open || !ref.current) return
    const c = caretCoords(ref.current, tokenStart)
    const wrapW = wrapperRef.current?.clientWidth ?? 600
    const left = Math.max(
      0,
      Math.min(c.left - ref.current.scrollLeft, Math.max(0, wrapW - 292)),
    )
    const top = c.top - ref.current.scrollTop + c.height + 4
    setCoords({ left, top })
  }, [open, tokenStart, value, caret])

  function syncCaret() {
    if (ref.current) setCaret(ref.current.selectionStart ?? 0)
  }

  function accept(c: Candidate) {
    const next = value.slice(0, tokenStart) + c.insert + value.slice(caret)
    pendingCaret.current = tokenStart + c.caret
    onChange(next)
    setOpen(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (showDropdown && !onlyExact) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActive((a) => (a + 1) % candidates.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActive((a) => (a - 1 + candidates.length) % candidates.length)
        return
      }
      if ((e.key === 'Enter' && !e.metaKey && !e.ctrlKey) || e.key === 'Tab') {
        e.preventDefault()
        accept(candidates[active])
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
        return
      }
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      onRun()
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <textarea
        ref={ref}
        value={value}
        spellCheck={false}
        rows={2}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value)
          setCaret(e.target.selectionStart ?? 0)
          setOpen(true)
        }}
        onKeyDown={handleKeyDown}
        onKeyUp={syncCaret}
        onClick={syncCaret}
        onBlur={() => setOpen(false)}
        className="text-foreground/90 placeholder:text-muted-foreground w-full resize-none bg-transparent font-mono text-sm leading-relaxed outline-none"
      />

      {showDropdown && !onlyExact ? (
        <ul
          style={{ left: coords.left, top: coords.top }}
          className="border-border bg-popover absolute z-30 w-72 overflow-hidden rounded-lg border py-1 shadow-xl"
        >
          {candidates.map((c, i) => (
            <li key={`${c.kind}-${c.name}`}>
              <button
                type="button"
                // mousedown (not click) + preventDefault keeps textarea focus.
                onMouseDown={(e) => {
                  e.preventDefault()
                  accept(c)
                }}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  'flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left',
                  i === active ? 'bg-muted' : 'hover:bg-muted/60',
                )}
              >
                <span className="text-foreground/90 font-mono text-[13px]">
                  {c.name}
                  {c.kind !== 'collection' ? (
                    <span className="text-muted-foreground">()</span>
                  ) : null}
                </span>
                <span className="text-muted-foreground text-[10px] uppercase tracking-wide">
                  {KIND_LABEL[c.kind]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
