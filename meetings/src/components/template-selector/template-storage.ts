import type { MeetingTemplate } from '@/lib/templates'

type FetchWithWorkspace = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>

export async function loadCustomTemplates(
  fetchWithWorkspace: FetchWithWorkspace,
): Promise<MeetingTemplate[]> {
  const response = await fetchWithWorkspace('/api/templates')
  if (!response.ok) return []
  const templates = (await response.json()) as MeetingTemplate[]
  return Array.isArray(templates) ? templates : []
}

export async function saveCustomTemplate(
  fetchWithWorkspace: FetchWithWorkspace,
  template: MeetingTemplate,
) {
  const response = await fetchWithWorkspace('/api/templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(template),
  })
  if (!response.ok) throw new Error('Failed to save template')
}

export async function deleteCustomTemplate(
  fetchWithWorkspace: FetchWithWorkspace,
  templateId: string,
) {
  const response = await fetchWithWorkspace(
    `/api/templates/${encodeURIComponent(templateId)}`,
    {
      method: 'DELETE',
    },
  )
  if (!response.ok) throw new Error('Failed to delete template')
}

export function createUntitledTemplate(): MeetingTemplate {
  return {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: 'Untitled template',
    icon: '📝',
    category: 'My Templates',
    description: 'A custom meeting note template.',
    context: 'Describe when this template should be used.',
    writingStyle: 'direct',
    sections: [
      {
        id: 'summary',
        title: 'Summary',
        prompt: 'Capture the most important context and outcome.',
        format: 'paragraph',
        length: 'concise',
        required: true,
      },
      {
        id: 'details',
        title: 'Details',
        prompt: 'Capture the relevant discussion and supporting details.',
        format: 'list',
        length: 'standard',
        required: true,
      },
      {
        id: 'next-steps',
        title: 'Next Steps',
        prompt: 'Capture follow-ups, owners, and open questions.',
        format: 'list',
        length: 'standard',
        required: true,
      },
    ],
  }
}

export function createTemplateCopy(template: MeetingTemplate): MeetingTemplate {
  const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2)}`
  const name =
    template.category === 'My Templates'
      ? `${template.name} copy`
      : `Copy of ${template.name}`

  return {
    ...template,
    id,
    name,
    category: 'My Templates',
    sections: template.sections.map((section, index) => ({
      ...section,
      id: `${section.id}-${index}-${id}`,
    })),
  }
}
