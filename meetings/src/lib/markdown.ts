export function normalizeGeneratedMarkdown(markdown: string) {
  const lines = markdown.trim().split(/\r?\n/)
  const normalized: string[] = []
  let inCodeFence = false

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    normalized.push(line)

    if (/^```/.test(line.trim())) {
      inCodeFence = !inCodeFence
      continue
    }

    if (!inCodeFence && /^#{1,6}\s+\S/.test(line.trim())) {
      while (index + 1 < lines.length && lines[index + 1].trim() === '') {
        index += 1
      }
    }
  }

  return normalized.join('\n').trim()
}
