import type { MailLabel, MailMessageSummary } from '../client/types'
import { __testing } from './action-suggestions'
import { describe, expect, it } from 'vitest'

function message(
  overrides: Partial<MailMessageSummary> & Pick<MailMessageSummary, 'id'>,
): MailMessageSummary {
  return {
    id: overrides.id,
    threadId: overrides.threadId ?? overrides.id,
    from: overrides.from ?? 'sender@example.com',
    to: overrides.to ?? 'user@example.com',
    subject: overrides.subject ?? '',
    date: overrides.date ?? new Date(0).toISOString(),
    snippet: overrides.snippet ?? '',
    labelIds: overrides.labelIds ?? ['INBOX'],
    unread: overrides.unread ?? true,
    starred: overrides.starred ?? false,
    important: overrides.important ?? false,
    internalDate: overrides.internalDate ?? 0,
    bodyText: overrides.bodyText,
    bodyHtmlText: overrides.bodyHtmlText,
    unsubscribe: overrides.unsubscribe,
  }
}

const labels: MailLabel[] = [
  { id: 'Label_Project', name: 'Project', type: 'user' },
  { id: 'Label_Reference', name: 'Reference', type: 'user' },
]

describe('LLM-only action suggestion normalization', () => {
  it('does not classify omitted rows with deterministic fallback rules', () => {
    const suggestions = __testing.normalizeSuggestionsPayload(
      {
        suggestions: [
          {
            messageId: 'personal-ask',
            groupId: 'reply-needed',
            confidence: 0.91,
            reason: 'Direct question.',
            suggestedLabelId: '',
            suggestedLabelName: '',
            matchedRuleIds: [],
          },
        ],
      },
      [
        message({
          id: 'automated-notice',
          from: 'Example Service <noreply@example-service.test>',
          subject: 'Your account notification',
          snippet: 'Here is a notification about your account.',
        }),
        message({
          id: 'personal-ask',
          from: 'Alex <alex@example.com>',
          subject: 'Can you approve this?',
          snippet: 'Can you reply today?',
        }),
      ],
      labels,
    )

    expect(suggestions).toHaveLength(2)
    expect(
      suggestions.find((item) => item.messageId === 'automated-notice'),
    ).toMatchObject({
      groupId: 'needs-review',
      reason: 'LLM did not classify this message.',
    })
    expect(
      suggestions.find((item) => item.messageId === 'personal-ask'),
    ).toMatchObject({
      groupId: 'reply-needed',
      confidence: 0.91,
    })
  })

  it('accepts existing labels from LLM output without regex-based fit checks', () => {
    const suggestions = __testing.normalizeSuggestionsPayload(
      {
        suggestions: [
          {
            messageId: 'message-1',
            groupId: 'label-archive',
            suggestedLabelId: 'Label_Project',
            suggestedLabelName: 'Project',
            confidence: 0.88,
            reason: 'Project reference.',
            matchedRuleIds: [],
          },
        ],
      },
      [message({ id: 'message-1' })],
      labels,
    )

    expect(suggestions[0]).toMatchObject({
      groupId: 'label-archive',
      suggestedLabelId: 'Label_Project',
      suggestedLabelName: 'Project',
    })
  })

  it('sends non-existent LLM labels to needs-review instead of guessing', () => {
    const suggestions = __testing.normalizeSuggestionsPayload(
      {
        suggestions: [
          {
            messageId: 'message-1',
            groupId: 'label-archive',
            suggestedLabelId: '',
            suggestedLabelName: 'Made Up Label',
            confidence: 0.88,
            reason: 'Project reference.',
            matchedRuleIds: [],
          },
        ],
      },
      [message({ id: 'message-1' })],
      labels,
    )

    expect(suggestions[0]).toMatchObject({
      groupId: 'needs-review',
      reason: 'LLM suggested a label that does not exist.',
    })
  })

  it('identifies synthetic fallbacks that should not poison the cache', () => {
    expect(
      __testing.isSyntheticFallbackSuggestion({
        id: 'message-1:fallback',
        messageId: 'message-1',
        groupId: 'needs-review',
        confidence: 0,
        reason: 'LLM classification unavailable.',
      }),
    ).toBe(true)

    expect(
      __testing.isSyntheticFallbackSuggestion({
        id: 'message-1:review',
        messageId: 'message-1',
        groupId: 'needs-review',
        confidence: 0.42,
        reason: 'Ambiguous account notice.',
      }),
    ).toBe(false)
  })

  it('emits an inline object JSON schema for AI structured output', () => {
    expect(__testing.actionSuggestionsJsonSchema).toMatchObject({
      type: 'object',
      properties: {
        suggestions: {
          type: 'array',
        },
      },
    })
    expect(__testing.actionSuggestionsJsonSchema).not.toHaveProperty('$ref')
    expect(__testing.actionSuggestionsJsonSchema).not.toHaveProperty('$schema')
    expect(JSON.stringify(__testing.actionSuggestionsJsonSchema)).not.toContain(
      'minimum',
    )
    expect(JSON.stringify(__testing.actionSuggestionsJsonSchema)).not.toContain(
      'maximum',
    )
  })
})
