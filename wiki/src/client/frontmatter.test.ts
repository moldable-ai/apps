import {
  mergeFrontmatterWithBody,
  splitMarkdownFrontmatter,
  stripFrontmatter,
} from './frontmatter'
import { describe, expect, it } from 'vitest'

describe('wiki frontmatter helpers', () => {
  it('strips Obsidian frontmatter and its separator blank line before editing markdown', () => {
    const content = [
      '---',
      'Hello:',
      '  - Does this work',
      '---',
      '',
      '# asdokasdf',
      '',
      '#asdfasdf ',
    ].join('\n')

    expect(stripFrontmatter(content)).toBe('# asdokasdf\n\n#asdfasdf ')
    expect(splitMarkdownFrontmatter(content).frontmatter).toEqual([
      'Hello:',
      '  - Does this work',
    ])
  })

  it('keeps exactly one separator blank line when merging editor body back into a note', () => {
    const content = [
      '---',
      'Hello:',
      '  - Does this work',
      '---',
      '',
      '# Old',
    ].join('\n')

    expect(mergeFrontmatterWithBody(content, '\n# New\n')).toBe(
      ['---', 'Hello:', '  - Does this work', '---', '', '# New', ''].join(
        '\n',
      ),
    )
  })

  it('preserves an empty body without leaking frontmatter into the editor', () => {
    const content = ['---', 'Hello:', '---', ''].join('\n')

    expect(stripFrontmatter(content)).toBe('')
    expect(mergeFrontmatterWithBody(content, '')).toBe('---\nHello:\n---\n')
  })
})
