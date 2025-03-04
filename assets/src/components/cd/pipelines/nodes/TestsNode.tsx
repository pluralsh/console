import { Chip, TestTubeIcon } from '@pluralsh/design-system'
import { GateState } from 'generated/graphql'

import {
  gateStateToCardStatus,
  gateStateToSeverity,
  IconHeading,
  NodeCardList,
  PipelineBaseNode,
  PipelineGateNodeProps,
  StatusCard,
} from './PipelineBaseNode'

const gateStateToTestText = {
  [GateState.Open]: 'Passed',
  [GateState.Pending]: 'Pending',
  [GateState.Closed]: 'Failed',
  [GateState.Running]: 'Running',
} as const satisfies Record<GateState, string>

export function TestsNode({ id, data }: PipelineGateNodeProps) {
  const { meta, ...edge } = data
  const gates = edge?.gates

  return (
    <PipelineBaseNode id={id}>
      {meta.state && (
        <div className="headerArea">
          <h2 className="heading">Action</h2>
          <Chip
            fillLevel={0}
            size="small"
            severity={gateStateToSeverity[meta.state]}
          >
            {gateStateToTestText[meta.state]}
          </Chip>
        </div>
      )}
      <IconHeading icon={<TestTubeIcon />}>Run test group</IconHeading>
      <NodeCardList>
        {gates?.map(
          (gate) =>
            gate && (
              <li>
                <StatusCard
                  status={
                    gate.state ? gateStateToCardStatus[gate.state] : undefined
                  }
                  statusLabel={
                    gate.state ? gateStateToTestText[gate.state] : undefined
                  }
                  fillLevel={0}
                >
                  {gate.name}
                </StatusCard>
              </li>
            )
        )}
      </NodeCardList>
    </PipelineBaseNode>
  )
}
