import type { Meeting } from '../types'
import { generateAppJson } from './llm/generate-json.server'
import { streamAppText } from './llm/stream.server'
import { normalizeGeneratedMarkdown } from './markdown'
import { DEFAULT_MEETING_TEMPLATE_ID, type MeetingTemplate } from './templates'

type EnhancedNotesJson = {
  markdown?: string
}

const enhancedNotesSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    markdown: {
      type: 'string',
      description:
        'Polished Markdown meeting notes. Must start with a section heading, not a title.',
    },
  },
  required: ['markdown'],
}

function getTranscriptMarkdown(meeting: Meeting) {
  if (meeting.segments.length === 0) return ''

  return meeting.segments
    .map((segment) => {
      const timestamp = formatTimestamp(segment.startTime)
      const speaker = segment.speaker ? `${segment.speaker}: ` : ''
      return `[${timestamp}] ${speaker}${segment.text}`
    })
    .join('\n')
}

function formatTimestamp(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

function templateInstructions(template: MeetingTemplate) {
  const writingStyle = template.writingStyle
    ? `Writing style: ${template.writingStyle}`
    : 'Writing style: direct'

  if (template.id === DEFAULT_MEETING_TEMPLATE_ID) {
    return [
      `Template: ${template.name}`,
      `Intent: ${template.description}`,
      `Context: ${template.context}`,
      writingStyle,
      '',
      'Default template behavior:',
      '- Do not copy template labels into the output. The output should not have generic headings like Topics, Summary, Overview, Key points, Notes, or Discussion.',
      '- Choose headings from the actual meeting content. Good headings name the specific topic, problem, proposal, decision, theme, or tension discussed.',
      '- Use a Granola-like structure: mostly content-specific sections, usually 3-7 sections for a substantive meeting.',
      '- End with `## Next steps` only when there are real follow-ups. If there are no concrete follow-ups, omit it.',
      '- Fold decisions, unresolved questions, risks, and rationale into the relevant topic section unless they are central enough to need their own specific heading.',
      '- Prefer dense, self-contained bullets under each topic. Avoid one-line filler bullets.',
      '- A substantive meeting should usually be detailed enough to be useful later; short meetings can stay short.',
    ].join('\n')
  }

  return [
    `Template: ${template.name}`,
    `Intent: ${template.description}`,
    `Context: ${template.context}`,
    writingStyle,
    '',
    'Requested sections:',
    ...template.sections.map((section) => {
      const options = [
        section.format ? `format: ${section.format}` : null,
        section.length ? `length: ${section.length}` : null,
        section.required ? 'required' : 'optional',
      ]
        .filter(Boolean)
        .join(', ')

      return `- ${section.title}${options ? ` (${options})` : ''}: ${section.prompt}`
    }),
  ].join('\n')
}

function buildEnhancedNotesPrompt({
  meeting,
  template,
}: {
  meeting: Meeting
  template: MeetingTemplate
}) {
  const manualNotes = meeting.notes?.trim() || '(No manual notes)'
  const transcript = getTranscriptMarkdown(meeting) || '(No transcript)'

  return `${templateInstructions(template)}

Meeting title, for context only. Do not repeat it in the output:
${meeting.title || 'Untitled meeting'}

Manual notes:
${manualNotes}

Transcript:
${transcript}`
}

const enhancedNotesSystemPrompt = `You turn meeting notes and transcripts into crisp, useful Markdown notes.

Rules:
- Use only the manual notes and transcript supplied by the user.
- Treat manual notes as the strongest signal for what the user cared about. Preserve their priorities and phrasing when it is useful, then add transcript context around them.
- Write like an attentive human note-taker, not like a transcript summarizer. Capture what changed, what matters, and what someone should remember later.
- Follow the selected template as guidance, but adapt the structure to the meeting. For the General meeting template, do not copy template labels as headings; prefer content-specific topic headings and dense bullets over a fixed recap scaffold.
- Omit empty sections when there is truly no relevant information.
- Do not include an H1 title.
- Do not repeat meeting metadata such as title, date, duration, or template name. The UI already renders those.
- Start directly with Markdown section headings using ## or ###.
- Prefer specific, self-contained bullets and compact paragraphs over generic filler.
- Preserve concrete decisions, action items, owners, risks, names, dates, numbers, constraints, and useful quotes or close paraphrases when present.
- Do not include long transcript excerpts or speaker-by-speaker chronology unless it is necessary to understand the outcome.
- Do not invent details that are not supported by the notes or transcript.`

export async function generateEnhancedNotes({
  meeting,
  template,
  workspaceId,
}: {
  meeting: Meeting
  template: MeetingTemplate
  workspaceId?: string
}) {
  const generated = await generateAppJson<EnhancedNotesJson>({
    workspaceId,
    purpose: 'meetings.enhanced-notes',
    schema: enhancedNotesSchema,
    schemaName: 'enhanced_meeting_notes',
    schemaDescription:
      'Template-driven enhanced meeting notes generated from manual notes and transcript.',
    maxOutputTokens: 3600,
    system: enhancedNotesSystemPrompt,
    prompt: buildEnhancedNotesPrompt({ meeting, template }),
  })

  const markdown = normalizeGeneratedMarkdown(generated.markdown ?? '')
  if (!markdown) {
    throw new Error('AI response did not include enhanced notes.')
  }

  return markdown
}

export async function streamEnhancedNotes({
  meeting,
  template,
  workspaceId,
}: {
  meeting: Meeting
  template: MeetingTemplate
  workspaceId?: string
}) {
  return streamAppText({
    workspaceId,
    purpose: 'meetings.enhanced-notes.stream',
    maxOutputTokens: 3600,
    system: `${enhancedNotesSystemPrompt}

Return only the Markdown notes as plain text. Do not wrap the result in JSON or a Markdown code fence.`,
    prompt: buildEnhancedNotesPrompt({ meeting, template }),
  })
}
