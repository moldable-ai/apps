import { appendAivaultRequestArgs } from './aivault'
import { describe, expect, it } from 'vitest'

describe('appendAivaultRequestArgs', () => {
  it('formats request headers with aivault KEY=VALUE syntax', () => {
    const args = ['json', 'netlify/deploys']

    appendAivaultRequestArgs(args, {
      method: 'POST',
      path: '/api/v1/sites/site-id/deploys',
      headers: { 'Content-Type': 'application/zip' },
      bodyFilePath: '/tmp/site.zip',
    })

    expect(args).toContain('--header')
    expect(args).toContain('Content-Type=application/zip')
    expect(args).not.toContain('Content-Type: application/zip')
  })
})
