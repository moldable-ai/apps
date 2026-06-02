// Pure helpers for the keypad: building expressions, balancing parentheses, and
// the small transforms (sign toggle) that don't map to a simple append. Kept
// separate from the React component so the editing logic is easy to reason about.

export interface Key {
  label: string
  // What to append to the expression. Omitted for action keys handled directly.
  append?: string
  kind: 'num' | 'op' | 'fn' | 'action'
  action?: 'clear' | 'back' | 'equals' | 'sign' | 'reciprocal'
  // Tailwind col-span for the grid.
  span?: number
}

// Basic 5×4 keypad.
export const BASIC_KEYS: Key[] = [
  { label: 'AC', kind: 'action', action: 'clear' },
  { label: '⌫', kind: 'action', action: 'back' },
  { label: '%', kind: 'op', append: '/100' },
  { label: '÷', kind: 'op', append: '÷' },

  { label: '7', kind: 'num', append: '7' },
  { label: '8', kind: 'num', append: '8' },
  { label: '9', kind: 'num', append: '9' },
  { label: '×', kind: 'op', append: '×' },

  { label: '4', kind: 'num', append: '4' },
  { label: '5', kind: 'num', append: '5' },
  { label: '6', kind: 'num', append: '6' },
  { label: '−', kind: 'op', append: '−' },

  { label: '1', kind: 'num', append: '1' },
  { label: '2', kind: 'num', append: '2' },
  { label: '3', kind: 'num', append: '3' },
  { label: '+', kind: 'op', append: '+' },

  { label: '±', kind: 'action', action: 'sign' },
  { label: '0', kind: 'num', append: '0' },
  { label: '.', kind: 'num', append: '.' },
  { label: '=', kind: 'action', action: 'equals' },
]

// Scientific keys (shown when the toggle is on), 4 columns.
export const SCIENTIFIC_KEYS: Key[] = [
  { label: '(', kind: 'fn', append: '(' },
  { label: ')', kind: 'fn', append: ')' },
  { label: 'x²', kind: 'op', append: '^2' },
  { label: 'xʸ', kind: 'op', append: '^' },

  { label: '√', kind: 'fn', append: 'sqrt(' },
  { label: 'sin', kind: 'fn', append: 'sin(' },
  { label: 'cos', kind: 'fn', append: 'cos(' },
  { label: 'tan', kind: 'fn', append: 'tan(' },

  { label: 'ln', kind: 'fn', append: 'ln(' },
  { label: 'log', kind: 'fn', append: 'log(' },
  { label: 'π', kind: 'num', append: 'π' },
  { label: 'e', kind: 'num', append: 'e' },

  { label: '1/x', kind: 'action', action: 'reciprocal' },
  { label: 'exp', kind: 'fn', append: 'exp(' },
  { label: 'n!', kind: 'op', append: '!' },
  { label: 'EE', kind: 'num', append: 'e' },
]

// Append a missing closing paren for each unmatched opening one. Lets users type
// "sin(45" and still get a result on "=".
export function balanceParens(expr: string): string {
  let depth = 0
  for (const ch of expr) {
    if (ch === '(') depth++
    else if (ch === ')') depth = Math.max(0, depth - 1)
  }
  return expr + ')'.repeat(depth)
}

// Toggle the sign of the trailing number in the expression. If the expression
// ends mid-operator (or is empty), insert a leading "-(" group so the next entry
// is negated.
export function toggleSign(expr: string): string {
  if (!expr) return '-'
  // Match the trailing run of digits (no sign — we handle the sign ourselves).
  const match = expr.match(/(\d*\.?\d+(?:[eE][+\-−]?\d+)?)$/)
  if (!match) return `${expr}-`

  const num = match[0]
  const head = expr.slice(0, expr.length - num.length)

  // If a unary minus already sits directly before the number, strip it.
  // It is unary when it's at the very start or follows an operator / open paren.
  if (head.endsWith('-')) {
    const before = head.slice(0, -1)
    const prevChar = before.slice(-1)
    if (before === '' || '(+-−×÷*/^'.includes(prevChar)) {
      return before + num
    }
  }
  return `${head}-${num}`
}

export function reciprocal(expr: string): string {
  if (!expr.trim()) return '1/('
  return `1/(${expr})`
}
