// Pre-render each template's cover slide to a lightweight gallery thumbnail.
// Requires the QA server on :8799 (MOLDABLE_PORT=8799 npx tsx src/server/index.ts).
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const decks = path.resolve('src/shared/templates/decks')
const OUT = path.resolve('template-thumbs')
fs.mkdirSync(OUT, { recursive: true })
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const ids = fs
  .readdirSync(decks)
  .filter((f) => f.endsWith('.ts'))
  .map((f) => f.replace(/\.ts$/, ''))
let ok = 0
for (const id of ids) {
  const png = `/tmp/thumb-${id}.png`
  try {
    execFileSync(
      CHROME,
      [
        '--headless=new',
        '--disable-gpu',
        '--hide-scrollbars',
        '--window-size=800,450',
        `--screenshot=${png}`,
        `http://127.0.0.1:8799/api/templates/${id}/preview/index.html?thumb=1&active=0`,
        '--virtual-time-budget=5000',
      ],
      { stdio: 'ignore', timeout: 40000 },
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
