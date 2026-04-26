type AppLlmMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface StreamAppTextOptions {
  workspaceId?: string
  purpose: string
  reasoningEffort?: 'none' | 'low' | 'medium' | 'high' | 'xhigh'
  system?: string
  prompt?: string
  messages?: AppLlmMessage[]
  maxOutputTokens?: number
}

function getAppLlmConfig() {
  const aiServerUrl =
    process.env.MOLDABLE_AI_SERVER_URL || 'http://127.0.0.1:39200'
  const appId = process.env.MOLDABLE_APP_ID || 'emails'
  const appToken = process.env.MOLDABLE_APP_TOKEN

  if (!appToken) {
    throw new Error('Moldable app token is not available.')
  }

  return { aiServerUrl, appId, appToken }
}

export async function streamAppText(
  options: StreamAppTextOptions,
): Promise<Response> {
  const { aiServerUrl, appId, appToken } = getAppLlmConfig()

  const res = await fetch(`${aiServerUrl}/api/llm/stream`, {
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
      reasoningEffort: options.reasoningEffort,
      system: options.system,
      prompt: options.prompt,
      messages: options.messages,
      maxOutputTokens: options.maxOutputTokens,
    }),
  })

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error || 'Failed to stream LLM response.')
  }

  if (!res.body) {
    throw new Error('LLM stream did not include a response body.')
  }

  return res
}
