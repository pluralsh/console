import { Chip, TestTubeIcon } from '@pluralsh/design-system'
import { GateState } from 'generated/graphql'

import {
  BaseNode,
  EdgeNode,
  IconHeading,
  NodeCardList,
  StatusCard,
  gateStateToCardStatus,
  gateStateToSeverity,
} from './BaseNode'

const gateStateToTestText = {
  [GateState.Open]: 'Passed',
  [GateState.Pending]: 'In progress',
  [GateState.Closed]: 'Failed',
} as const satisfies Record<GateState, string>

export function TestsNode(props: EdgeNode) {
  const {
    data: { meta, ...edge },
  } = props
  const gates = edge?.gates

  return (
    <BaseNode {...props}>
      {meta.state && (
        <div className="headerArea">
          <h2 className="heading">Action</h2>
          <Chip
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
                >
                  {gate.name}
                </StatusCard>
              </li>
            )
        )}
      </NodeCardList>
    </BaseNode>
  )
}
