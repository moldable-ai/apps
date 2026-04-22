type AppLlmMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

type GenerateAppJsonOptions = {
  workspaceId?: string
  purpose: string
  system?: string
  prompt?: string
  messages?: AppLlmMessage[]
  schema: Record<string, unknown>
  schemaName?: string
  schemaDescription?: string
  maxOutputTokens?: number
}

function getAppLlmConfig() {
  const aiServerUrl =
    process.env.MOLDABLE_AI_SERVER_URL || 'http://127.0.0.1:39200'
  const appId = process.env.MOLDABLE_APP_ID || 'meetings'
  const appToken = process.env.MOLDABLE_APP_TOKEN

  if (!appToken) {
    throw new Error('Moldable app token is not available.')
  }

  return { aiServerUrl, appId, appToken }
}

export async function generateAppJson<T>(
  options: GenerateAppJsonOptions,
): Promise<T> {
  const { aiServerUrl, appId, appToken } = getAppLlmConfig()

  const res = await fetch(`${aiServerUrl}/api/llm/generate-json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-moldable-app-id': appId,
      'x-moldable-app-token': appToken,
    },
    body: JSON.stringify({
      appId,
      workspaceId: options.workspaceId,
      purpose: options.purpose,
      system: options.system,
      prompt: options.prompt,
      messages: options.messages,
      schema: options.schema,
      schemaName: options.schemaName,
      schemaDescription: options.schemaDescription,
      maxOutputTokens: options.maxOutputTokens,
    }),
  })

  const body = (await res.json()) as { json?: T; error?: string }
  if (!res.ok) {
    throw new Error(body.error || 'Failed to generate structured JSON.')
  }

  if (!body.json) {
    throw new Error('AI response did not include structured JSON.')
  }

  return body.json
}
