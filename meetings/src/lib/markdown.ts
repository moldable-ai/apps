const LIST_ITEM_PATTERN = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/
const CODE_FENCE_PATTERN = /^```/

function markdownIndentWidth(indent: string) {
  return indent.replaceAll('\t', '    ').length
}

function normalizeListIndent(line: string) {
  const match = line.match(LIST_ITEM_PATTERN)
  if (!match) return line

  const [, indent = '', marker = '-', content = ''] = match
  const indentWidth = markdownIndentWidth(indent)
  if (indentWidth === 0 || indentWidth % 4 === 0) return line

  // Lexical's markdown list importer treats four spaces as one nested level.
  // LLMs commonly emit two-space nested bullets, which otherwise render as
  // flat sibling bullets in the editor. Convert those generated indents to the
  // shape Lexical expects while leaving top-level bullets unchanged.
  const normalizedWidth =
    indentWidth % 2 === 0
      ? (indentWidth / 2) * 4
      : Math.ceil(indentWidth / 4) * 4

  return `${' '.repeat(normalizedWidth)}${marker} ${content}`
}

function looksLikeFlattenedChildBullet(content: string) {
  const trimmed = content.trim()
  if (!trimmed) return false

  // When an LLM writes "- parent:" followed by "- child" lines without
  // indentation, the child lines are usually fragments/lowercase labels or
  // bold labels. Stop before normal sentence-case bullets so we do not pull the
  // rest of the section into the nested list.
  return /^[`"'([{*_~]*[a-z0-9]/.test(trimmed) || /^\*\*[^*]+\*\*/.test(trimmed)
}

export function normalizeGeneratedMarkdown(markdown: string) {
  const lines = markdown.trim().split(/\r?\n/)
  const normalized: string[] = []
  let inCodeFence = false
  let pendingChildIndent = 0

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const trimmed = line.trim()

    if (CODE_FENCE_PATTERN.test(trimmed)) {
      inCodeFence = !inCodeFence
      pendingChildIndent = 0
      normalized.push(line)
      continue
    }

    if (inCodeFence) {
      normalized.push(line)
      continue
    }

    let outputLine = line
    const listMatch = line.match(LIST_ITEM_PATTERN)

    if (!trimmed || /^#{1,6}\s+\S/.test(trimmed)) {
      pendingChildIndent = 0
    } else if (listMatch) {
      const [, indent = '', marker = '-', content = ''] = listMatch
      const indentWidth = markdownIndentWidth(indent)

      if (
        indentWidth === 0 &&
        pendingChildIndent > 0 &&
        looksLikeFlattenedChildBullet(content)
      ) {
        outputLine = `${' '.repeat(pendingChildIndent)}${marker} ${content}`
      } else {
        pendingChildIndent = content.trim().endsWith(':')
          ? Math.max(indentWidth + 4, 4)
          : 0
      }
    } else {
      pendingChildIndent = 0
    }

    normalized.push(normalizeListIndent(outputLine))

    if (/^#{1,6}\s+\S/.test(trimmed)) {
      while (index + 1 < lines.length && lines[index + 1].trim() === '') {
        index += 1
      }
    }
  }

  return normalized.join('\n').trim()
}
