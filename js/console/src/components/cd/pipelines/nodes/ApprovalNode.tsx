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
    <PipelineBaseNode
      id={id}
      headerText="action"
      headerChip={<GateNodeHeaderChip state={meta.state} />}
    >
      <IconHeading icon={<ThumbsUpIcon />}>Approval</IconHeading>
      <NodeCardList>
        {gates?.map((gate) =>
          gate?.approver ? (
            <li key={gate.id}>
              <ApproverCard gate={gate} />
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
        width="100%"
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

export function GateNodeHeaderChip({ state }: { state: Nullable<GateState> }) {
  if (!state) return null
  return (
    <Chip
      fillLevel={0}
      size="small"
      severity={gateStateToSeverity[state]}
    >
      {gateStateToApprovalText[state]}
    </Chip>
  )
}
