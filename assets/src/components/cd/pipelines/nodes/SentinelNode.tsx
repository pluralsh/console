import { Button, Card, IconFrame, SentinelIcon } from '@pluralsh/design-system'

import { useTheme } from 'styled-components'

import { statusToIcon } from 'components/ai/sentinels/SentinelsTableCols'
import { getRunNameFromId } from 'components/ai/sentinels/sentinel/SentinelRunsTables'
import { Confirm } from 'components/utils/Confirm'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { StackedText } from 'components/utils/table/StackedText'
import { Body2P } from 'components/utils/typography/Text'
import { GateState, useForceGateMutation } from 'generated/graphql'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getSentinelRunAbsPath } from 'routes/aiRoutesConsts'
import { fromNow } from 'utils/datetime'
import { GateNodeHeaderChip } from './ApprovalNode'
import { PipelineBaseNode, PipelineGateNodeProps } from './PipelineBaseNode'

export function SentinelNode({ id, data }: PipelineGateNodeProps) {
  const { spacing } = useTheme()
  const { meta, ...edge } = data
  const { sentinel, sentinelRun, id: gateId } = edge?.gates?.[0] ?? {}

  return (
    <PipelineBaseNode
      id={id}
      headerText="action"
      headerChip={<GateNodeHeaderChip state={meta.state} />}
    >
      <StackedText
        icon={<IconFrame icon={<SentinelIcon />} />}
        iconGap="xsmall"
        first="Sentinel"
        firstPartialType="body2Bold"
        firstColor="text"
        second={sentinel?.name ?? 'Unknown name'}
      />
      <Card
        clickable
        as={Link}
        to={getSentinelRunAbsPath({
          sentinelId: sentinel?.id ?? '',
          runId: sentinelRun?.id ?? '',
        })}
        style={{ textDecoration: 'none', padding: spacing.small }}
      >
        {sentinelRun ? (
          <StretchedFlex gap="xlarge">
            <StackedText
              first={getRunNameFromId(sentinelRun?.id ?? '')}
              firstPartialType="body2Bold"
              firstColor="text"
              second={
                sentinelRun.completedAt
                  ? `Completed ${fromNow(sentinelRun.completedAt)}`
                  : sentinelRun.insertedAt
                    ? `Started ${fromNow(sentinelRun.insertedAt)}`
                    : '---'
              }
            />
            {statusToIcon(sentinelRun?.status, true)}
          </StretchedFlex>
        ) : (
          <Body2P $color="text-xlight">No runs yet</Body2P>
        )}
      </Card>
      {meta.state === GateState.Pending && (
        <ForceGateButton id={gateId ?? ''} />
      )}
    </PipelineBaseNode>
  )
}

function ForceGateButton({ id }: { id: string }) {
  const [confirmIsOpen, setConfirmIsOpen] = useState(false)

  const [forceGate, { loading, error }] = useForceGateMutation({
    variables: { id },
    refetchQueries: ['Pipeline'],
    awaitRefetchQueries: true,
    onCompleted: () => setConfirmIsOpen(false),
  })

  return (
    <>
      <Button
        small
        secondary
        width="100%"
        onClick={() => setConfirmIsOpen(true)}
      >
        Force approve
      </Button>
      <Confirm
        open={confirmIsOpen}
        loading={loading}
        error={error}
        title={null}
        text="Are you sure you want to manually approve this gate?"
        label="Approve"
        submit={() => forceGate()}
        close={() => setConfirmIsOpen(false)}
      />
    </>
  )
}
