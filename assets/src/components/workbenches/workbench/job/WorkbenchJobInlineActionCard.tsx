import {
  Button,
  CaretDownIcon,
  Code,
  FailedFilledIcon,
  Flex,
  FormField,
  IconFrame,
  Input,
  KubernetesIcon,
  Modal,
  StatusOkIcon,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { StackedText } from 'components/utils/table/StackedText'
import { CaptionP } from 'components/utils/typography/Text'
import {
  useApproveWorkbenchJobActivityMutation,
  useRejectWorkbenchJobActivityMutation,
  WorkbenchJobActivityFragment,
  WorkbenchJobActivityStatus,
} from 'generated/graphql'
import { FormEvent, useState } from 'react'
import styled, { DefaultTheme, useTheme } from 'styled-components'
import { formatDateTime } from 'utils/datetime'
import {
  getActionDescription,
  getActionIcon,
  getActionInputJson,
  getActionResultJson,
  getActionSubtitle,
  getActionTitle,
} from './workbenchJobActionsUtils'
import { WorkbenchJobActionDenialResult } from './WorkbenchJobActionDenialResult'
import { WorkbenchJobActionStatusChip } from './WorkbenchJobActionStatusChip'

export function WorkbenchJobInlineActionCard({
  activity,
}: {
  activity: WorkbenchJobActivityFragment
}) {
  const theme = useTheme()
  const [expanded, setExpanded] = useState(
    activity.status === WorkbenchJobActivityStatus.NeedsApproval
  )
  const [error, setError] = useState<string | null>(null)
  const [denyOpen, setDenyOpen] = useState(false)
  const [denyReason, setDenyReason] = useState('')
  const needsApproval =
    activity.status === WorkbenchJobActivityStatus.NeedsApproval
  const inputJson = getActionInputJson(activity)
  const isDenied = activity.status === WorkbenchJobActivityStatus.Cancelled
  const resultJson = isDenied ? '' : getActionResultJson(activity)
  const icon = getActionIcon(activity)

  const refetchQueries = [
    'WorkbenchJobActivities',
    'WorkbenchJobActions',
    'WorkbenchJobActionSummary',
  ]
  const [approve, { loading: approving }] =
    useApproveWorkbenchJobActivityMutation({
      variables: { id: activity.id },
      onError: (err) => setError(err.message),
      refetchQueries,
    })
  const [reject, { loading: rejecting, error: rejectError }] =
    useRejectWorkbenchJobActivityMutation({
      onCompleted: () => {
        setDenyOpen(false)
        setDenyReason('')
      },
      refetchQueries,
    })

  const closeDenyModal = () => {
    if (rejecting) return
    setDenyOpen(false)
    setDenyReason('')
  }

  const onDeny = (e?: FormEvent) => {
    e?.preventDefault()
    reject({
      variables: {
        id: activity.id,
        reason: denyReason.trim() || undefined,
      },
    })
  }

  return (
    <CardSC $status={activity.status}>
      <HeaderSC>
        <Flex
          align="center"
          gap="small"
          css={{ minWidth: 0, flex: 1 }}
        >
          <IconFrame
            circle
            size="medium"
            type="secondary"
            icon={icon ?? <KubernetesIcon size={16} />}
            css={{
              flexShrink: 0,
              border: theme.borders.default,
              backgroundColor: 'transparent',
            }}
          />
          <StackedText
            first={getActionTitle(activity)}
            firstPartialType="body2Bold"
            firstColor="text-light"
            second={getActionSubtitle(activity)}
            secondColor="text-xlight"
            truncate
            css={{ flex: 1, minWidth: 0 }}
          />
        </Flex>
        <HeaderActionsSC>
          <InlineActionStatus activity={activity} />
          <ExpandButtonSC
            type="button"
            aria-label={expanded ? 'Collapse action' : 'Expand action'}
            onClick={() => setExpanded((value) => !value)}
            $expanded={expanded}
          >
            <CaretDownIcon size={12} />
          </ExpandButtonSC>
        </HeaderActionsSC>
      </HeaderSC>

      {expanded && (
        <>
          {error && <GqlError error={error} />}
          <CaptionP $color="text-xlight">
            {getActionDescription(activity)}
          </CaptionP>
          {!!inputJson && (
            <ActionData>
              <CaptionP $color="text-xlight">INPUT</CaptionP>
              <Code
                language="json"
                showHeader={false}
              >
                {inputJson}
              </Code>
            </ActionData>
          )}
          {!!resultJson && (
            <ActionData>
              <CaptionP $color="text-xlight">RESULT</CaptionP>
              <Code
                language="json"
                showHeader={false}
                css={
                  activity.status === WorkbenchJobActivityStatus.Failed
                    ? { borderColor: theme.colors['border-danger'] }
                    : undefined
                }
              >
                {resultJson}
              </Code>
            </ActionData>
          )}
          <WorkbenchJobActionDenialResult activity={activity} />
          {!!activity.insertedAt && (
            <TimeSC>
              <span>Start time</span>
              <strong>
                {formatDateTime(
                  activity.insertedAt,
                  'YYYY-MM-DD HH:mm:ss [UTC]',
                  false,
                  true
                )}
              </strong>
            </TimeSC>
          )}
          {needsApproval && (
            <ApprovalActionsSC>
              <Button
                small
                secondary
                disabled={approving}
                onClick={() => {
                  setError(null)
                  setDenyOpen(true)
                }}
                css={{
                  color: theme.colors['text-danger-light'],
                  borderColor: theme.colors['border-danger'],
                  '&:hover': {
                    color: theme.colors['text-danger-light'],
                    borderColor: theme.colors['border-danger'],
                  },
                }}
              >
                Deny
              </Button>
              <Button
                small
                loading={approving}
                disabled={approving}
                onClick={() => {
                  setError(null)
                  approve()
                }}
              >
                Approve
              </Button>
            </ApprovalActionsSC>
          )}
        </>
      )}

      <Modal
        header="Deny action"
        open={denyOpen}
        onClose={closeDenyModal}
        asForm
        onSubmit={onDeny}
        actions={
          <Flex gap="small">
            <Button
              secondary
              type="button"
              disabled={rejecting}
              onClick={closeDenyModal}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              destructive
              loading={rejecting}
            >
              Deny
            </Button>
          </Flex>
        }
      >
        <Flex
          direction="column"
          gap="medium"
        >
          {rejectError && <GqlError error={rejectError} />}
          <FormField label="Reason">
            <Input
              multiline
              minRows={3}
              maxRows={6}
              value={denyReason}
              onChange={(e) => setDenyReason(e.target.value)}
              placeholder="Explain why this action was denied"
            />
          </FormField>
        </Flex>
      </Modal>
    </CardSC>
  )
}

function InlineActionStatus({
  activity,
}: {
  activity: WorkbenchJobActivityFragment
}) {
  if (activity.status === WorkbenchJobActivityStatus.Successful)
    return (
      <StatusOkIcon
        size={16}
        color="icon-success"
      />
    )
  if (activity.status === WorkbenchJobActivityStatus.Failed)
    return (
      <FailedFilledIcon
        size={16}
        color="icon-danger"
      />
    )

  return <WorkbenchJobActionStatusChip status={activity.status} />
}

function statusBorderColor(
  theme: DefaultTheme,
  status: WorkbenchJobActivityStatus
) {
  switch (status) {
    case WorkbenchJobActivityStatus.NeedsApproval:
      return theme.colors['border-warning']
    case WorkbenchJobActivityStatus.Pending:
    case WorkbenchJobActivityStatus.Running:
      return theme.colors['border-info']
    case WorkbenchJobActivityStatus.Successful:
      return theme.colors['border-success']
    case WorkbenchJobActivityStatus.Failed:
      return theme.colors['border-danger']
    default:
      return theme.colors.border
  }
}

const CardSC = styled.div<{ $status: WorkbenchJobActivityStatus }>(
  ({ theme, $status }) => ({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.medium,
    width: '100%',
    minWidth: 0,
    padding: theme.spacing.medium,
    border: theme.borders.default,
    borderLeft: `2px solid ${statusBorderColor(theme, $status)}`,
    borderRadius: theme.borderRadiuses.large,
    background: theme.colors['fill-zero'],
    overflow: 'hidden',
    marginBottom: theme.spacing.small,
  })
)

const HeaderSC = styled.div({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  minWidth: 0,
  width: '100%',
})

const HeaderActionsSC = styled.div({
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  flexShrink: 0,
})

const ExpandButtonSC = styled.button<{ $expanded: boolean }>(
  ({ theme, $expanded }) => ({
    ...theme.partials.reset.button,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: theme.colors['icon-light'],
    transform: $expanded ? 'rotate(180deg)' : undefined,
    transition: 'transform 150ms ease',
    '&:hover': { color: theme.colors['icon-default'] },
    '&:focus-visible': { outline: theme.borders['outline-focused'] },
  })
)

const ActionData = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xxsmall,
  minWidth: 0,
  width: '100%',
}))

const ApprovalActionsSC = styled.div({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
})

const TimeSC = styled.div(({ theme }) => ({
  ...theme.partials.text.caption,
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xxsmall,
  color: theme.colors['text-xlight'],
  fontSize: 10,
  strong: {
    color: theme.colors['text-light'],
    fontWeight: 400,
  },
}))
