import { AppIcon, Chip, ThumbsUpIcon } from '@pluralsh/design-system'
import { GateState, PipelineGateFragment } from 'generated/graphql'

import { ComponentPropsWithoutRef } from 'react'

import styled from 'styled-components'

import {
  BaseNode,
  EdgeNode,
  IconHeading,
  NodeCardList,
  ServiceCard,
  StatusCard,
  gateStateToCardStatus,
  gateStateToSeverity,
} from './BaseNode'

export const gateStateToApprovalText = {
  [GateState.Open]: 'Approved',
  [GateState.Pending]: 'Waiting',
  [GateState.Closed]: 'Blocked',
} as const satisfies Record<GateState, string>

const ApproverCardSC = styled(StatusCard)(({ theme }) => ({
  '.contentArea': {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.small,
  },
  '.name': {
    ...theme.partials.text.body2,
    color: theme.colors['text-light'],
  },
  '.email': {
    ...theme.partials.text.caption,
    color: theme.colors['text-xlight'],
    marginTop: -theme.spacing.xxxsmall,
  },
}))

export function ApproverCard({
  gate,
  ...props
}: { gate: PipelineGateFragment } & ComponentPropsWithoutRef<
  typeof ApproverCardSC
>) {
  const { approver } = gate

  if (!approver) {
    return null
  }

  return (
    <ApproverCardSC
      status={gate.state ? gateStateToCardStatus[gate.state] : undefined}
      statusLabel={gate.state ? gateStateToApprovalText[gate.state] : undefined}
      {...props}
    >
      <AppIcon
        size="xxsmall"
        name={approver.name}
        url={approver.profile ?? undefined}
        spacing="none"
      />
      <div>
        <p className="name">{approver.name}</p>
        <p className="email">{approver.email}</p>
      </div>
    </ApproverCardSC>
  )
}

export function ApprovalNode(props: EdgeNode) {
  const {
    data: { meta, ...edge },
  } = props

  const gates = edge?.gates

  return (
    <BaseNode {...props}>
      <div className="headerArea">
        <h2 className="heading">Action</h2>
        {meta.state && (
          <Chip
            size="small"
            severity={gateStateToSeverity[meta.state]}
          >
            {gateStateToApprovalText[meta.state]}
          </Chip>
        )}
      </div>
      <IconHeading icon={<ThumbsUpIcon />}>Approval</IconHeading>
      <NodeCardList>
        {gates?.map((gate) =>
          gate?.approver ? (
            <li>
              <ApproverCard gate={gate} />
            </li>
          ) : (
            gate && (
              <li>
                <ServiceCard
                  status={gateStateToCardStatus[gate.state]}
                  statusLabel={gateStateToApprovalText[gate.state]}
                >
                  {gate.name}
                </ServiceCard>
              </li>
            )
          )
        )}
      </NodeCardList>
    </BaseNode>
  )
}
