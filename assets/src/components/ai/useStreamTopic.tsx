import { LoginContext } from 'components/contexts'
import { useContext, useMemo } from 'react'

export function useStreamTopic({
  insightId,
  scopeId,
  threadId,
}: {
  insightId?: string
  scopeId?: string
  threadId?: string
}) {
  const { me } = useContext(LoginContext)
  return useMemo(() => {
    if (insightId) {
      return `ai:insight:${insightId}:${me?.id}`
    }

    if (threadId) {
      return `ai:thread:${threadId}:${me?.id}`
    }

    return `ai:freeform:${scopeId}:${me?.id}`
  }, [insightId, threadId, scopeId, me])
}
