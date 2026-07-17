import { workingSession } from './working-session'
import { describe, expect, it } from 'vitest'

describe('working session runtime', () => {
  it('waits for durable state hydration before seeding or accepting input', () => {
    const runtime = workingSession.runtime?.js ?? ''

    expect(runtime).toMatch(
      /function init\(\) \{\s+\/\/[^\n]+\n\s+\/\/[^\n]+\n\s+if \(!hydrated\) return;/,
    )
    for (const event of ['pointerdown', 'click', 'keydown', 'input']) {
      expect(runtime).toMatch(
        new RegExp(
          `document\\.addEventListener\\('${event}', function \\(event\\) \\{\\s+if \\(!hydrated\\) return;`,
        ),
      )
    }
  })
})
