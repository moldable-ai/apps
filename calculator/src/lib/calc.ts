// A small, dependency-free, safe math expression evaluator shared by the client
// keypad and the server RPC handler. It tokenizes, converts to RPN via the
// shunting-yard algorithm, then evaluates — so there is no `eval`/`Function` and
// no way for an expression to reach the host environment.

export type AngleMode = 'deg' | 'rad'

export class CalcError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CalcError'
  }
}

type TokenType = 'number' | 'operator' | 'function' | 'paren' | 'comma'

interface Token {
  type: TokenType
  value: string
}

const FUNCTIONS = new Set([
  'sin',
  'cos',
  'tan',
  'asin',
  'acos',
  'atan',
  'sinh',
  'cosh',
  'tanh',
  'ln',
  'log',
  'log2',
  'sqrt',
  'cbrt',
  'exp',
  'abs',
  'round',
  'floor',
  'ceil',
])

// Operator precedence and associativity. `u-` / `u+` are unary and bind less
// tightly than exponentiation so `-2^2` is parsed as `-(2^2)`; `!` is postfix
// factorial; `%` here is the binary modulo/percent operator handled at eval time.
const OPERATORS: Record<
  string,
  { prec: number; assoc: 'left' | 'right'; args: 1 | 2; postfix?: boolean }
> = {
  '!': { prec: 6, assoc: 'left', args: 1, postfix: true },
  '^': { prec: 5, assoc: 'right', args: 2 },
  'u-': { prec: 4, assoc: 'right', args: 1 },
  'u+': { prec: 4, assoc: 'right', args: 1 },
  '*': { prec: 3, assoc: 'left', args: 2 },
  '/': { prec: 3, assoc: 'left', args: 2 },
  '%': { prec: 3, assoc: 'left', args: 2 },
  '+': { prec: 2, assoc: 'left', args: 2 },
  '-': { prec: 2, assoc: 'left', args: 2 },
}

const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  π: Math.PI,
  e: Math.E,
  tau: Math.PI * 2,
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  const src = input.trim()

  const isDigit = (ch: string) => ch >= '0' && ch <= '9'
  const isIdentStart = (ch: string) => /[a-zA-Zπ]/.test(ch)
  const isIdentPart = (ch: string) => /[a-zA-Z0-9π]/.test(ch)

  while (i < src.length) {
    const ch = src[i]

    if (ch === ' ' || ch === '\t' || ch === '\n') {
      i++
      continue
    }

    // Number: digits, decimal point, scientific notation (1e3, 1.5E-2).
    if (isDigit(ch) || (ch === '.' && isDigit(src[i + 1] ?? ''))) {
      let num = ''
      let hasDecimal = false
      while (i < src.length && (isDigit(src[i]) || src[i] === '.')) {
        if (src[i] === '.') {
          if (hasDecimal) throw new CalcError('Malformed number')
          hasDecimal = true
        }
        num += src[i++]
      }
      if (src[i] === 'e' || src[i] === 'E') {
        // Exponent — only consume if it forms a valid scientific suffix.
        const next = src[i + 1]
        const afterSign = src[i + 2]
        if (
          isDigit(next ?? '') ||
          ((next === '+' || next === '-' || next === '−') &&
            isDigit(afterSign ?? ''))
        ) {
          num += src[i++]
          if (src[i] === '+' || src[i] === '-' || src[i] === '−') {
            num += src[i] === '−' ? '-' : src[i]
            i++
          }
          while (i < src.length && isDigit(src[i])) num += src[i++]
        }
      }
      tokens.push({ type: 'number', value: num })
      continue
    }

    // Identifier: function name or constant.
    if (isIdentStart(ch)) {
      let ident = ''
      while (i < src.length && isIdentPart(src[i])) ident += src[i++]
      const lower = ident.toLowerCase()
      if (FUNCTIONS.has(lower)) {
        tokens.push({ type: 'function', value: lower })
      } else if (lower in CONSTANTS || ident in CONSTANTS) {
        tokens.push({
          type: 'number',
          value: String(CONSTANTS[ident] ?? CONSTANTS[lower]),
        })
      } else {
        throw new CalcError(`Unknown name "${ident}"`)
      }
      continue
    }

    if (ch === '(' || ch === ')') {
      tokens.push({ type: 'paren', value: ch })
      i++
      continue
    }

    if (ch === ',') {
      tokens.push({ type: 'comma', value: ',' })
      i++
      continue
    }

    if (ch === '×') {
      tokens.push({ type: 'operator', value: '*' })
      i++
      continue
    }
    if (ch === '÷') {
      tokens.push({ type: 'operator', value: '/' })
      i++
      continue
    }
    if (ch === '−') {
      tokens.push({ type: 'operator', value: '-' })
      i++
      continue
    }

    if ('+-*/^%!'.includes(ch)) {
      tokens.push({ type: 'operator', value: ch })
      i++
      continue
    }

    throw new CalcError(`Unexpected character "${ch}"`)
  }

  return tokens
}

function factorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) {
    throw new CalcError('Factorial needs a non-negative integer')
  }
  if (n > 170) return Infinity
  let result = 1
  for (let k = 2; k <= n; k++) result *= k
  return result
}

function applyFunction(name: string, x: number, mode: AngleMode): number {
  const toRad = (deg: number) => (mode === 'deg' ? (deg * Math.PI) / 180 : deg)
  const fromRad = (rad: number) =>
    mode === 'deg' ? (rad * 180) / Math.PI : rad
  const requireUnitInterval = () => {
    if (x < -1 || x > 1) {
      throw new CalcError(`${name} needs a value from -1 to 1`)
    }
  }
  const requirePositive = () => {
    if (x <= 0) throw new CalcError(`${name} needs a positive number`)
  }

  switch (name) {
    case 'sin':
      return Math.sin(toRad(x))
    case 'cos':
      return Math.cos(toRad(x))
    case 'tan': {
      const angle = toRad(x)
      if (Math.abs(Math.cos(angle)) < 1e-12) {
        throw new CalcError('Result is undefined')
      }
      return Math.tan(angle)
    }
    case 'asin':
      requireUnitInterval()
      return fromRad(Math.asin(x))
    case 'acos':
      requireUnitInterval()
      return fromRad(Math.acos(x))
    case 'atan':
      return fromRad(Math.atan(x))
    case 'sinh':
      return Math.sinh(x)
    case 'cosh':
      return Math.cosh(x)
    case 'tanh':
      return Math.tanh(x)
    case 'ln':
      requirePositive()
      return Math.log(x)
    case 'log':
      requirePositive()
      return Math.log10(x)
    case 'log2':
      requirePositive()
      return Math.log2(x)
    case 'sqrt':
      if (x < 0) throw new CalcError('sqrt needs a non-negative number')
      return Math.sqrt(x)
    case 'cbrt':
      return Math.cbrt(x)
    case 'exp':
      return Math.exp(x)
    case 'abs':
      return Math.abs(x)
    case 'round':
      return Math.round(x)
    case 'floor':
      return Math.floor(x)
    case 'ceil':
      return Math.ceil(x)
    default:
      throw new CalcError(`Unknown function "${name}"`)
  }
}

// Convert the token stream to Reverse Polish Notation, resolving unary +/- by
// looking at the previous token.
function toRpn(tokens: Token[]): Token[] {
  const output: Token[] = []
  const stack: Token[] = []

  let prev: Token | null = null
  for (const token of tokens) {
    if (token.type === 'number') {
      output.push(token)
    } else if (token.type === 'function') {
      stack.push(token)
    } else if (token.type === 'comma') {
      while (stack.length && stack[stack.length - 1].value !== '(') {
        output.push(stack.pop()!)
      }
    } else if (token.type === 'operator') {
      let op = token.value
      // Disambiguate unary minus/plus and postfix factorial.
      const isUnaryPosition =
        prev === null ||
        (prev.type === 'operator' && !OPERATORS[prev.value]?.postfix) ||
        (prev.type === 'paren' && prev.value === '(') ||
        prev.type === 'comma'
      if ((op === '-' || op === '+') && isUnaryPosition) {
        op = op === '-' ? 'u-' : 'u+'
      }

      const o1 = OPERATORS[op]
      if (!o1) throw new CalcError(`Unknown operator "${op}"`)

      if (o1.postfix) {
        // Postfix operator (factorial) applies immediately.
        output.push({ type: 'operator', value: op })
      } else if (op === 'u-' || op === 'u+') {
        // Prefix unary operators apply to the next operand. Push them without
        // popping prior binary operators so `2^-2` becomes `2 ^ (-2)`, while
        // exponentiation can still bind before a leading unary in `-2^2`.
        stack.push({ type: 'operator', value: op })
      } else {
        while (stack.length) {
          const top = stack[stack.length - 1]
          if (top.type === 'function') {
            output.push(stack.pop()!)
            continue
          }
          if (top.type !== 'operator') break
          const o2 = OPERATORS[top.value]
          if (!o2) break
          if (
            (o1.assoc === 'left' && o1.prec <= o2.prec) ||
            (o1.assoc === 'right' && o1.prec < o2.prec)
          ) {
            output.push(stack.pop()!)
          } else {
            break
          }
        }
        stack.push({ type: 'operator', value: op })
      }
    } else if (token.value === '(') {
      stack.push(token)
    } else if (token.value === ')') {
      while (stack.length && stack[stack.length - 1].value !== '(') {
        output.push(stack.pop()!)
      }
      if (!stack.length) throw new CalcError('Mismatched parentheses')
      stack.pop() // discard '('
      if (stack.length && stack[stack.length - 1].type === 'function') {
        output.push(stack.pop()!)
      }
    }
    prev = token
  }

  while (stack.length) {
    const top = stack.pop()!
    if (top.type === 'paren') throw new CalcError('Mismatched parentheses')
    output.push(top)
  }

  return output
}

function evalRpn(rpn: Token[], mode: AngleMode): number {
  const stack: number[] = []

  for (const token of rpn) {
    if (token.type === 'number') {
      const value = Number(token.value)
      if (Number.isNaN(value)) throw new CalcError('Malformed number')
      stack.push(value)
      continue
    }

    if (token.type === 'function') {
      const x = stack.pop()
      if (x === undefined) throw new CalcError('Malformed expression')
      stack.push(applyFunction(token.value, x, mode))
      continue
    }

    if (token.type === 'operator') {
      const op = OPERATORS[token.value]
      if (!op) throw new CalcError(`Unknown operator "${token.value}"`)

      if (op.args === 1) {
        const x = stack.pop()
        if (x === undefined) throw new CalcError('Malformed expression')
        if (token.value === 'u-') stack.push(-x)
        else if (token.value === 'u+') stack.push(x)
        else if (token.value === '!') stack.push(factorial(x))
        else throw new CalcError(`Unknown operator "${token.value}"`)
        continue
      }

      const b = stack.pop()
      const a = stack.pop()
      if (a === undefined || b === undefined) {
        throw new CalcError('Malformed expression')
      }
      switch (token.value) {
        case '+':
          stack.push(a + b)
          break
        case '-':
          stack.push(a - b)
          break
        case '*':
          stack.push(a * b)
          break
        case '/':
          if (b === 0) throw new CalcError('Division by zero')
          stack.push(a / b)
          break
        case '%':
          if (b === 0) throw new CalcError('Modulo by zero')
          stack.push(a % b)
          break
        case '^':
          stack.push(Math.pow(a, b))
          break
        default:
          throw new CalcError(`Unknown operator "${token.value}"`)
      }
    }
  }

  if (stack.length !== 1) throw new CalcError('Malformed expression')
  const result = stack[0]
  if (!Number.isFinite(result)) {
    if (Number.isNaN(result)) throw new CalcError('Result is undefined')
    // Infinity (e.g. very large factorial / overflow) — surface as a clear error.
    throw new CalcError('Result is out of range')
  }
  return result
}

/** Evaluate a math expression. Throws CalcError on any malformed input. */
export function evaluate(expression: string, mode: AngleMode = 'deg'): number {
  if (!expression || !expression.trim()) {
    throw new CalcError('Empty expression')
  }
  const tokens = tokenize(expression)
  if (!tokens.length) throw new CalcError('Empty expression')
  const rpn = toRpn(tokens)
  return evalRpn(rpn, mode)
}

/** Format a numeric result for display: trims float noise, groups thousands. */
export function formatResult(value: number, maxDigits = 12): string {
  if (!Number.isFinite(value)) return 'Error'
  if (value === 0) return '0'

  const abs = Math.abs(value)
  // Fall back to exponential for extreme magnitudes.
  if (abs !== 0 && (abs < 1e-6 || abs >= 1e15)) {
    return value.toExponential(6).replace(/\.?0+e/, 'e')
  }

  // Round to a sane precision, then strip trailing zeros.
  const rounded = Number(value.toPrecision(maxDigits))
  const [intPart, fracPart] = String(rounded).split('.')
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return fracPart ? `${grouped}.${fracPart}` : grouped
}
