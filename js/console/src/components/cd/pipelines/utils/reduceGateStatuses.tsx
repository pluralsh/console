import { GateState } from 'generated/graphql'

export function reduceGateStates(
  gates: Nullable<Nullable<{ state: Nullable<GateState> }>[]>
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
