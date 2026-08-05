import {
  Button,
  CaretDownIcon,
  Code,
  FailedFilledIcon,
  Flex,
  IconFrame,
  KubernetesIcon,
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
  WorkbenchJobActivityType,
} from 'generated/graphql'
import { useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { formatDateTime } from 'utils/datetime'
import {
  getActionDescription,
  getActionIcon,
  getActionInputJson,
  getActionResultJson,
  getActionResultLanguage,
  getActionStatusBorderColor,
  getActionSubtitle,
  getActionTitle,
  WORKBENCH_JOB_ACTION_REFETCH_QUERIES,
} from './workbenchJobActionsUtils'
import { getKubeActionVariant } from './workbenchJobKubeActionUtils'
import {
  WorkbenchJobKubeActionChips,
  WorkbenchJobKubeUpdateDiff,
} from './WorkbenchJobKubeUpdateDiff'
import { WorkbenchJobActionDenialResult } from './WorkbenchJobActionDenialResult'
import { WorkbenchJobActionDenyButton } from './WorkbenchJobActionDenyPopover'
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
  const needsApproval =
    activity.status === WorkbenchJobActivityStatus.NeedsApproval
  const isKubernetes = activity.type === WorkbenchJobActivityType.Kubernetes
  const kubeVariant = getKubeActionVariant(activity.result?.kubeRequest?.method)
  const isKubeDiff =
    isKubernetes &&
    needsApproval &&
    (kubeVariant === 'create' ||
      kubeVariant === 'update' ||
      kubeVariant === 'delete')
  const inputJson = getActionInputJson(activity)
  const isDenied =
    activity.status === WorkbenchJobActivityStatus.Cancelled ||
    activity.status === WorkbenchJobActivityStatus.Rejected
  const resultJson = isDenied ? '' : getActionResultJson(activity)
  const resultLanguage = getActionResultLanguage(activity)
  const icon = getActionIcon(activity)

  const [approve, { loading: approving }] =
    useApproveWorkbenchJobActivityMutation({
      variables: { id: activity.id },
      onError: (err) => setError(err.message),
      refetchQueries: WORKBENCH_JOB_ACTION_REFETCH_QUERIES,
    })
  const [reject, { loading: rejecting, error: rejectError }] =
    useRejectWorkbenchJobActivityMutation({
      refetchQueries: WORKBENCH_JOB_ACTION_REFETCH_QUERIES,
    })

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
          <WorkbenchJobKubeActionChips
            type={activity.type}
            method={activity.result?.kubeRequest?.method}
            statusChip={<InlineActionStatus activity={activity} />}
          />
          <ExpandButtonSC
            type="button"
            aria-label={expanded ? 'Collapse action' : 'Expand action'}
            aria-expanded={expanded}
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
          {!isKubernetes && (
            <CaptionP $color="text-xlight">
              {getActionDescription(activity)}
            </CaptionP>
          )}
          {isKubeDiff ? (
            <WorkbenchJobKubeUpdateDiff
              activityId={activity.id}
              kubeRequest={activity.result?.kubeRequest}
              enabled={expanded}
            />
          ) : (
            <>
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
                    language={resultLanguage}
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
            </>
          )}
          <WorkbenchJobActionDenialResult activity={activity} />
          {!isKubeDiff && !!activity.insertedAt && (
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
              <WorkbenchJobActionDenyButton
                disabled={approving}
                rejecting={rejecting}
                rejectError={rejectError}
                onDeny={(reason) =>
                  reject({
                    variables: {
                      id: activity.id,
                      reason: reason || undefined,
                    },
                  })
                }
              />
              <Button
                small
                loading={approving}
                disabled={approving || rejecting}
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

const CardSC = styled.div<{ $status: WorkbenchJobActivityStatus }>(
  ({ theme, $status }) => ({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.medium,
    width: '100%',
    minWidth: 0,
    padding: theme.spacing.medium,
    border: theme.borders.default,
    borderLeft: `${theme.borderRadiuses.large / 2}px solid ${getActionStatusBorderColor(theme, $status)}`,
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
