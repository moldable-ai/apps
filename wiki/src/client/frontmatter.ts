export interface MarkdownFrontmatterParts {
  body: string
  frontmatter: string[]
  frontmatterBlock: string
}

/**
 * Split Obsidian-style YAML frontmatter away from the editable Markdown body.
 *
 * Keep this behavior intentionally conservative:
 * - Frontmatter is recognized only when the note starts with `---`.
 * - The body sent into Lexical must not include the blank separator line after
 *   the closing `---`.
 *
 * That separator line looks harmless in raw Markdown, but it was the root cause
 * of a long-lived editor corruption bug. When a note contained properties such
 * as:
 *
 *   ---
 *   Hello:
 *     - Does this work
 *   ---
 *
 *   # Heading
 *
 * the previous splitter passed `\n# Heading` into Lexical. Programmatic syncs
 * then created a leading empty paragraph before the real content. After that,
 * markdown shortcuts could stop matching or text input could appear one
 * character per visual line. Removing the YAML separator blank line here keeps
 * frontmatter portable on disk while ensuring Lexical only receives the body
 * the user can actually edit.
 */
function splitLines(content: string) {
  return content.replace(/^\uFEFF/, '').split(/\r?\n/)
}

export function splitMarkdownFrontmatter(
  content: string,
): MarkdownFrontmatterParts {
  const lines = splitLines(content)
  if (lines[0] !== '---') {
    return { body: content, frontmatter: [], frontmatterBlock: '' }
  }

  const endLineIndex = lines.findIndex(
    (line, index) => index > 0 && line.trim() === '---',
  )
  if (endLineIndex === -1) {
    return { body: content, frontmatter: [], frontmatterBlock: '' }
  }

  const bodyLines = lines.slice(endLineIndex + 1)
  while (bodyLines[0] === '') bodyLines.shift()

  return {
    body: bodyLines.join('\n'),
    frontmatter: lines.slice(1, endLineIndex),
    frontmatterBlock: lines.slice(0, endLineIndex + 1).join('\n'),
  }
}

export function frontmatterEndIndex(content: string) {
  const parts = splitMarkdownFrontmatter(content)
  return parts.frontmatterBlock ? parts.frontmatterBlock.length : -1
}

export function stripFrontmatter(content: string) {
  return splitMarkdownFrontmatter(content).body
}

export function mergeFrontmatterWithBody(content: string, body: string) {
  const parts = splitMarkdownFrontmatter(content)
  if (!parts.frontmatterBlock) return body
  if (!body.trim()) return `${parts.frontmatterBlock}\n`
  return `${parts.frontmatterBlock}\n\n${body.trimStart()}`
}
