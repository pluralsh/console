import { ApolloError } from '@apollo/client'
import {
  DevboxTinyFragment,
  useAttachDevboxMutation,
  useDetachDevboxMutation,
} from 'generated/graphql'
import { useCallback, useState } from 'react'

export type WorkbenchDevboxesDraft = Nullable<{
  initialIds: string[]
  boxes: DevboxTinyFragment[]
}>

// applies the attachments staged in the workbench form, once it has an id
export function useSyncWorkbenchDevboxes() {
  const [attach] = useAttachDevboxMutation()
  const [detach] = useDetachDevboxMutation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ApolloError>()

  const sync = useCallback(
    async (workbenchId: Nullable<string>, draft: WorkbenchDevboxesDraft) => {
      if (!workbenchId || !draft) return
      const current = draft.boxes.map(({ id }) => id)
      const added = current.filter((id) => !draft.initialIds.includes(id))
      const removed = draft.initialIds.filter((id) => !current.includes(id))
      if (!added.length && !removed.length) return
      setLoading(true)
      setError(undefined)
      await Promise.all([
        ...added.map((devboxId) =>
          attach({ variables: { workbenchId, devboxId } })
        ),
        ...removed.map((devboxId) =>
          detach({ variables: { workbenchId, devboxId } })
        ),
      ])
        .catch((e) => {
          if (e instanceof ApolloError) setError(e)
          throw e
        })
        .finally(() => setLoading(false))
    },
    [attach, detach]
  )

  return [sync, { loading, error }] as const
}
