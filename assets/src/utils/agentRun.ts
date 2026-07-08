import { fetchToken } from 'helpers/auth'

export type AgentRunUploadName = 'patch' | 'session' | 'screen_recording'

export async function fetchAgentRunUpload(
  runId: string,
  name: AgentRunUploadName
): Promise<string> {
  const token = fetchToken()
  const response = await fetch(
    `/v1/api/ai/runs/${runId}/downloads/${name}`,
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
  )

  if (!response.ok) {
    throw new Error(
      `Unable to fetch agent run ${name} (${response.status} ${response.statusText})`
    )
  }

  return response.text()
}
