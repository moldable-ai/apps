// Pre-render each template's cover to a lightweight gallery thumbnail (a deck's
// cover slide, or a page's hero). Requires the QA server on :8799
// (MOLDABLE_PORT=8799 npx tsx src/server/index.ts).
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve('src/shared/templates')
const OUT = path.resolve('template-thumbs')
fs.mkdirSync(OUT, { recursive: true })
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const ids = ['pages', 'decks'].flatMap((dir) => {
  const abs = path.join(root, dir)
  return fs.existsSync(abs)
    ? fs
        .readdirSync(abs)
        .filter((f) => f.endsWith('.ts'))
        .map((f) => f.replace(/\.ts$/, ''))
    : []
})
let ok = 0
for (const id of ids) {
  const png = `/tmp/thumb-${id}.png`
  try {
    execFileSync(
      CHROME,
      [
        '--headless=new',
        '--hide-scrollbars',
        '--window-size=1280,720',
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
        `--screenshot=${png}`,
        `http://127.0.0.1:8799/api/templates/${id}/preview/index.html?thumb=1&active=0`,
        '--virtual-time-budget=6000',
      ],
      { stdio: 'ignore', timeout: 50000 },
    )
    execFileSync(
      'sips',
      [
        '-Z',
        '640',
        '-s',
        'format',
        'jpeg',
        '-s',
        'formatOptions',
        '80',
        png,
        '--out',
        path.join(OUT, `${id}.jpg`),
      ],
      { stdio: 'ignore' },
    )
    ok++
    console.log('thumb', id)
  } catch (e) {
    console.error('FAIL', id, e.message)
  }
}
console.log(`=== thumbs done: ${ok}/${ids.length} ===`)
