import { parseEbook } from './epub-parser'
import { strToU8, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'

function buildEpub(): Uint8Array {
  const containerXml = `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`

  const opf = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Test Book</dc:title>
    <dc:creator>A. Writer</dc:creator>
    <dc:language>en</dc:language>
    <meta name="cover" content="cover-img"/>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ch1" href="ch1.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch2" href="ch2.xhtml" media-type="application/xhtml+xml"/>
    <item id="cover-img" href="cover.png" media-type="image/png"/>
    <item id="pic" href="images/pic.png" media-type="image/png"/>
  </manifest>
  <spine>
    <itemref idref="ch1"/>
    <itemref idref="ch2"/>
  </spine>
</package>`

  const ch1 = `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Chapter One</title></head>
<body>
  <h1>Chapter One</h1>
  <p>The quick brown fox jumps over the lazy dog.</p>
</body>
</html>`

  const ch2 = `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Chapter Two</title></head>
<body>
  <p>Here is a picture below.</p>
  <img src="images/pic.png?cache=1#cover" alt="A picture"/>
</body>
</html>`

  const nav = `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<body>
  <nav epub:type="toc">
    <ol>
      <li><a href="ch1.xhtml">Chapter One</a></li>
      <li><a href="ch2.xhtml">Chapter Two</a></li>
    </ol>
  </nav>
</body>
</html>`

  const picBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
  const coverBytes = new Uint8Array([137, 80, 78, 71, 1, 2, 3, 4])

  return zipSync({
    mimetype: strToU8('application/epub+zip'),
    'META-INF/container.xml': strToU8(containerXml),
    'OEBPS/content.opf': strToU8(opf),
    'OEBPS/ch1.xhtml': strToU8(ch1),
    'OEBPS/ch2.xhtml': strToU8(ch2),
    'OEBPS/nav.xhtml': strToU8(nav),
    'OEBPS/images/pic.png': picBytes,
    'OEBPS/cover.png': coverBytes,
  })
}

describe('parseEbook', () => {
  it('parses a minimal EPUB', async () => {
    const book = await parseEbook('test.epub', buildEpub())

    expect(book.format).toBe('epub')
    expect(book.title).toBe('Test Book')
    expect(book.author).toBe('A. Writer')
    expect(book.language).toBe('en')

    expect(book.chapters).toHaveLength(2)
    expect(book.chapters[0]?.title).toBe('Chapter One')
    expect(book.chapters[0]?.text).toContain('quick brown fox')
    expect(book.chapters[0]?.text).not.toContain('Chapter One\n\nChapter One')
    expect(book.chapters[0]?.html).not.toContain('<title>')

    const ch2 = book.chapters[1]
    expect(ch2?.html).toContain('__RES__/')
    expect(ch2?.html).toContain('__RES__/OEBPS/images/pic.png')
    expect(ch2?.html).not.toContain('cache=1')

    const picResource = book.resources.find((r) =>
      r.path.endsWith('images/pic.png'),
    )
    expect(picResource).toBeDefined()
    expect(picResource?.contentType).toBe('image/png')

    expect(book.cover).not.toBeNull()
    expect(book.cover?.ext).toBe('png')
  })

  it('parses plain text', async () => {
    const buffer = new TextEncoder().encode(
      'Hello world.\n\nSecond paragraph here.',
    )
    const book = await parseEbook('notes.txt', buffer)

    expect(book.format).toBe('txt')
    expect(book.title).toBe('notes')
    expect(book.author).toBeNull()
    expect(book.language).toBe('en')
    expect(book.chapters.length).toBeGreaterThanOrEqual(1)
    expect(book.chapters[0]?.text).toContain('Hello world')
  })

  it('throws on corrupt non-text input', async () => {
    const garbage = new Uint8Array([0, 1, 2, 3, 4, 5])
    await expect(parseEbook('broken.epub', garbage)).rejects.toThrow(
      'Unsupported or corrupt file',
    )
  })
})
