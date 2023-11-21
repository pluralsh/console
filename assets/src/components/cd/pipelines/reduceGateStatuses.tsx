import { GateState, PipelineGateFragment } from 'generated/graphql'

export function reduceGateStatuses(
  gates: Nullable<Nullable<PipelineGateFragment>[]>
) {
  let reducedState: GateState | undefined

  if (gates?.some((g) => g?.state === GateState.Closed)) {
    reducedState = GateState.Closed
  } else if (gates?.some((g) => g?.state === GateState.Pending)) {
    reducedState = GateState.Pending
  } else if (gates?.every((g) => g?.state === GateState.Open)) {
    reducedState = GateState.Open
  }

  return reducedState
}
