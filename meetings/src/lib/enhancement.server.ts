import type { Meeting } from '../types'
import { generateAppJson } from './llm/generate-json.server'
import type { MeetingTemplate } from './templates'

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

export async function generateEnhancedNotes({
  meeting,
  template,
  workspaceId,
}: {
  meeting: Meeting
  template: MeetingTemplate
  workspaceId?: string
}) {
  const manualNotes = meeting.notes?.trim() || '(No manual notes)'
  const transcript = getTranscriptMarkdown(meeting) || '(No transcript)'

  const generated = await generateAppJson<EnhancedNotesJson>({
    workspaceId,
    purpose: 'meetings.enhanced-notes',
    schema: enhancedNotesSchema,
    schemaName: 'enhanced_meeting_notes',
    schemaDescription:
      'Template-driven enhanced meeting notes generated from manual notes and transcript.',
    maxOutputTokens: 2200,
    system: `You turn meeting notes and transcripts into crisp, useful Markdown notes.

Rules:
- Use only the manual notes and transcript supplied by the user.
- Follow the selected template closely, but omit empty sections when there is truly no relevant information.
- Do not include an H1 title.
- Do not repeat meeting metadata such as title, date, duration, or template name. The UI already renders those.
- Start directly with Markdown section headings using ## or ###.
- Prefer specific bullets over generic filler.
- Preserve concrete decisions, action items, owners, risks, names, and dates when present.
- Do not invent details that are not supported by the notes or transcript.`,
    prompt: `${templateInstructions(template)}

Meeting title, for context only. Do not repeat it in the output:
${meeting.title || 'Untitled meeting'}

Manual notes:
${manualNotes}

Transcript:
${transcript}`,
  })

  const markdown = generated.markdown?.trim() ?? ''
  if (!markdown) {
    throw new Error('AI response did not include enhanced notes.')
  }

  return markdown
}
