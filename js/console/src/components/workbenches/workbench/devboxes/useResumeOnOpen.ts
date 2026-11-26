import { DevboxInstanceStatus } from 'generated/graphql'
import { useEffect, useRef } from 'react'

// opening a suspended instance resumes it, judged once by its status when
// opened (undefined until it's known), so one suspended while open stays
// suspended
export function useResumeOnOpen({
  instanceId,
  status,
  resume,
}: {
  instanceId: string
  status: Nullable<DevboxInstanceStatus>
  resume: () => void
}) {
  const judged = useRef<string | null>(null)
  useEffect(() => {
    if (!status || judged.current === instanceId) return
    judged.current = instanceId
    if (status === DevboxInstanceStatus.Suspended) resume()
  }, [instanceId, resume, status])
}
