import { authorizationHeader, fetchToken } from 'helpers/auth'

export type AgentRunUploadName = 'patch' | 'session' | 'screen_recording'

export async function fetchAgentRunUpload(
  runId: string,
  name: AgentRunUploadName
): Promise<string> {
  const authorization = authorizationHeader(fetchToken())
  const response = await fetch(
    `/v1/api/ai/runs/${runId}/downloads/${name}`,
    authorization ? { headers: { Authorization: authorization } } : undefined
  )

  if (!response.ok) {
    throw new Error(
      `Unable to fetch agent run ${name} (${response.status} ${response.statusText})`
    )
  }

  return response.text()
}
