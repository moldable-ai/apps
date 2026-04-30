export interface SqlStatement {
  sql: string
  start: number
  end: number
}

export function splitSqlStatements(sql: string): SqlStatement[] {
  const statements: SqlStatement[] = []
  let start = 0
  let index = 0
  let quote: "'" | '"' | '`' | null = null
  let dollarQuote: string | null = null
  let lineComment = false
  let blockComment = false

  function pushStatement(end: number) {
    const raw = sql.slice(start, end).trim()
    if (raw) {
      const leadingWhitespace =
        sql.slice(start, end).match(/^\s*/)?.[0].length ?? 0
      statements.push({
        sql: raw,
        start: start + leadingWhitespace,
        end,
      })
    }
    start = end + 1
  }

  while (index < sql.length) {
    const char = sql[index]
    const next = sql[index + 1]

    if (lineComment) {
      if (char === '\n') lineComment = false
      index += 1
      continue
    }

    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false
        index += 2
        continue
      }
      index += 1
      continue
    }

    if (dollarQuote) {
      if (sql.startsWith(dollarQuote, index)) {
        index += dollarQuote.length
        dollarQuote = null
        continue
      }
      index += 1
      continue
    }

    if (quote) {
      if (char === quote) {
        if (quote === "'" && next === "'") {
          index += 2
          continue
        }
        quote = null
      }
      index += 1
      continue
    }

    if (char === '-' && next === '-') {
      lineComment = true
      index += 2
      continue
    }

    if (char === '/' && next === '*') {
      blockComment = true
      index += 2
      continue
    }

    if (char === "'" || char === '"' || char === '`') {
      quote = char
      index += 1
      continue
    }

    if (char === '$') {
      const match = sql.slice(index).match(/^\$[a-zA-Z_][a-zA-Z0-9_]*\$|^\$\$/)
      if (match) {
        dollarQuote = match[0]
        index += dollarQuote.length
        continue
      }
    }

    if (char === ';') {
      pushStatement(index)
    }

    index += 1
  }

  pushStatement(sql.length)
  return statements
}

export function getSqlStatementAtOffset(sql: string, offset: number): string {
  const statements = splitSqlStatements(sql)
  if (statements.length === 0) return ''

  const current = statements.find((statement) => {
    return offset >= statement.start && offset <= statement.end
  })

  if (current) return current.sql

  const previous = [...statements]
    .reverse()
    .find((statement) => offset > statement.end)
  return previous?.sql ?? statements[0].sql
}
