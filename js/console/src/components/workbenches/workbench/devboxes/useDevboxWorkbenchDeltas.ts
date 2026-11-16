import {
  Delta,
  useDevboxInstanceStatusDeltaSubscription,
  useDevboxSnapshotDeltaSubscription,
} from 'generated/graphql'

// instance status changes are normalized into the cache by id; list
// membership (new or removed instances and snapshots) needs a refetch
export function useDevboxWorkbenchDeltas(
  workbenchId: Nullable<string>,
  {
    onInstanceListChange,
    onSnapshotChange,
  }: {
    onInstanceListChange?: () => void
    onSnapshotChange?: () => void
  } = {}
) {
  useDevboxInstanceStatusDeltaSubscription({
    variables: { workbenchId: workbenchId ?? undefined },
    skip: !workbenchId,
    onData: ({ data: { data } }) => {
      const delta = data?.devboxInstanceStatusDelta?.delta
      if (delta && delta !== Delta.Update) onInstanceListChange?.()
    },
  })
  useDevboxSnapshotDeltaSubscription({
    variables: { workbenchId: workbenchId ?? '' },
    skip: !workbenchId,
    onData: () => onSnapshotChange?.(),
  })
}
