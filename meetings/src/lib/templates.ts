export interface MeetingTemplateSection {
  id: string
  title: string
  prompt: string
  format?: 'paragraph' | 'list'
  length?: 'concise' | 'standard' | 'detailed'
  required?: boolean
}

export interface MeetingTemplate {
  id: string
  name: string
  icon: string
  category: 'Core' | 'General' | 'Specialized' | 'My Templates'
  description: string
  context: string
  writingStyle?: 'direct' | 'narrative' | 'objective'
  sections: MeetingTemplateSection[]
}

export const DEFAULT_MEETING_TEMPLATE_ID = 'general-meeting'

export const MEETING_TEMPLATES: MeetingTemplate[] = [
  {
    id: 'general-meeting',
    name: 'General meeting',
    icon: '📝',
    category: 'Core',
    description: 'Granola-style notes organized around the actual topics.',
    context:
      "Use this for most meetings. Let the conversation decide the shape: preserve the user's notes as priority signals, add useful transcript context, and avoid empty boilerplate sections.",
    writingStyle: 'direct',
    sections: [
      {
        id: 'topics',
        title: 'Topics',
        prompt:
          'Create content-specific sections from the meeting. Prefer 3-7 natural headings that name the actual topic, decision, problem, proposal, or theme. Under each heading, use dense bullets with useful context, rationale, constraints, names, numbers, dates, decisions, risks, and close paraphrases. Do not use generic headings like Summary, Notes, Key points, or Discussion when a more specific heading is possible.',
        format: 'list',
        length: 'detailed',
        required: true,
      },
      {
        id: 'actions',
        title: 'Next steps',
        prompt:
          'End with this section only when there are real follow-ups, owners, deadlines, promised materials, or topics to revisit. If the owner is unknown, say so rather than guessing.',
        format: 'list',
        length: 'standard',
      },
    ],
  },
  {
    id: 'one-on-one',
    name: '1:1',
    icon: '💬',
    category: 'General',
    description: 'Relationship-focused notes for recurring check-ins.',
    context: 'Use for manager reports, coaching, mentorship, and check-ins.',
    sections: [
      {
        id: 'pulse',
        title: 'Pulse',
        prompt: 'How the person or relationship is doing.',
      },
      {
        id: 'topics',
        title: 'Topics Discussed',
        prompt: 'Work, blockers, feedback, and open questions.',
      },
      {
        id: 'support',
        title: 'Support Needed',
        prompt: 'Where help, context, or follow-through is needed.',
      },
      {
        id: 'next',
        title: 'Next Check-in',
        prompt: 'Commitments or topics to revisit.',
      },
    ],
  },
  {
    id: 'sales-call',
    name: 'Sales call',
    icon: '🤝',
    category: 'Specialized',
    description: 'Discovery notes, objections, and follow-up plan.',
    context: 'Use for prospect, customer, and partnership calls.',
    sections: [
      {
        id: 'account',
        title: 'Account Context',
        prompt: 'Who joined, their role, and why they are evaluating.',
      },
      {
        id: 'needs',
        title: 'Needs and Pain Points',
        prompt: 'Problems, priorities, urgency, and success criteria.',
      },
      {
        id: 'objections',
        title: 'Objections and Risks',
        prompt: 'Concerns, blockers, budget, timing, or competitors.',
      },
      {
        id: 'next',
        title: 'Next Steps',
        prompt: 'Follow-ups, owners, and timeline.',
      },
    ],
  },
  {
    id: 'interview',
    name: 'Interview',
    icon: '🎙️',
    category: 'Specialized',
    description: 'Candidate signals, evidence, and recommendation.',
    context: 'Use for hiring, screening, and evaluation conversations.',
    sections: [
      {
        id: 'candidate',
        title: 'Candidate Snapshot',
        prompt: 'Relevant background, role fit, and framing.',
      },
      {
        id: 'signals',
        title: 'Strong Signals',
        prompt: 'Specific evidence that supports or weakens the hire case.',
      },
      {
        id: 'concerns',
        title: 'Concerns',
        prompt: 'Risks, gaps, or follow-up areas.',
      },
      {
        id: 'recommendation',
        title: 'Recommendation',
        prompt: 'Clear next step or hiring recommendation.',
      },
    ],
  },
  {
    id: 'project-sync',
    name: 'Project sync',
    icon: '📌',
    category: 'General',
    description: 'Status, blockers, decisions, and delivery risks.',
    context: 'Use for team standups, delivery reviews, and planning syncs.',
    sections: [
      {
        id: 'status',
        title: 'Status',
        prompt: 'Current progress and what changed since the last sync.',
      },
      {
        id: 'blockers',
        title: 'Blockers',
        prompt: 'Risks, dependencies, and open questions.',
      },
      {
        id: 'decisions',
        title: 'Decisions',
        prompt: 'Decisions made, tradeoffs, and unresolved choices.',
      },
      {
        id: 'next',
        title: 'Next Steps',
        prompt: 'Owners, deadlines, and immediate follow-through.',
      },
    ],
  },
  {
    id: 'user-research',
    name: 'User research',
    icon: '🔎',
    category: 'Specialized',
    description: 'User goals, pain points, quotes, and product insights.',
    context:
      'Use for customer discovery, usability sessions, and feedback calls.',
    sections: [
      {
        id: 'profile',
        title: 'Participant Context',
        prompt: 'Who the participant is and what they are trying to do.',
      },
      {
        id: 'observations',
        title: 'Observations',
        prompt: 'Behaviors, friction, needs, and repeated patterns.',
      },
      {
        id: 'quotes',
        title: 'Notable Quotes',
        prompt: 'Directly useful phrases or paraphrased customer language.',
      },
      {
        id: 'opportunities',
        title: 'Opportunities',
        prompt: 'Product implications and follow-up questions.',
      },
    ],
  },
]

export function getTemplateById(
  templateId: string | undefined,
  templates: MeetingTemplate[] = MEETING_TEMPLATES,
) {
  return (
    templates.find((template) => template.id === templateId) ??
    templates.find((template) => template.id === DEFAULT_MEETING_TEMPLATE_ID) ??
    templates[0]
  )
}
