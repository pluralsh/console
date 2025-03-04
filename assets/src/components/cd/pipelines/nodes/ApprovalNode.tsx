import { AppIcon, Button, Chip, ThumbsUpIcon } from '@pluralsh/design-system'
import {
  GateState,
  PipelineGateFragment,
  useApproveGateMutation,
} from 'generated/graphql'

import { ComponentPropsWithoutRef, useState } from 'react'

import styled from 'styled-components'

import { Confirm } from 'components/utils/Confirm'

import { ApolloError } from '@apollo/client'

import {
  PipelineBaseNode,
  IconHeading,
  NodeCardList,
  StatusCard,
  gateStateToCardStatus,
  gateStateToSeverity,
  PipelineGateNodeProps,
} from './PipelineBaseNode'

export const gateStateToApprovalText = {
  [GateState.Open]: 'Approved',
  [GateState.Pending]: 'Waiting',
  [GateState.Running]: 'Running',
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
}: { gate: PipelineGateFragment } & Omit<
  ComponentPropsWithoutRef<typeof ApproverCardSC>,
  'status' | 'statusLabel'
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

export function ApprovalNode({ id, data }: PipelineGateNodeProps) {
  const { meta, ...edge } = data

  const gates = edge?.gates

  return (
    <PipelineBaseNode id={id}>
      <div className="headerArea">
        <h2 className="heading">Action</h2>
        {meta.state && (
          <Chip
            fillLevel={0}
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
            <li key={gate.id}>
              <ApproverCard
                gate={gate}
                fillLevel={0}
              />
            </li>
          ) : (
            gate && (
              <li key={gate.id}>
                <ApproveButton id={gate.id} />
              </li>
            )
          )
        )}
      </NodeCardList>
    </PipelineBaseNode>
  )
}

function ApproveButton({
  id,
  onCompleted,
  onError,
}: {
  id: string
  onCompleted?: () => void
  onError?: (e: ApolloError) => void
}) {
  const [confirmIsOpen, setConfirmIsOpen] = useState(false)

  const [approveGateMutation, { loading, error }] = useApproveGateMutation({
    variables: { id },
    onCompleted: () => {
      onCompleted?.()
    },
    onError: (e) => onError?.(e),
  })

  return (
    <>
      <Button
        small
        secondary
        onClick={() => {
          setConfirmIsOpen(true)
        }}
      >
        Approve
      </Button>
      <Confirm
        open={confirmIsOpen}
        loading={loading}
        error={error}
        title={null}
        text="Are you sure you want to approve this?"
        label="Approve"
        submit={() => {
          approveGateMutation()
        }}
        close={() => setConfirmIsOpen(false)}
      />
    </>
  )
}
