import {
  ArrowLeftIcon,
  Button,
  Chip,
  Code,
  FailedFilledIcon,
  Flex,
  IconFrame,
  KubernetesIcon,
  StatusOkIcon,
  WarningIcon,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { StackedText } from 'components/utils/table/StackedText'
import { CaptionP } from 'components/utils/typography/Text'
import {
  useApproveWorkbenchJobActivityMutation,
  useRejectWorkbenchJobActivityMutation,
  WorkbenchJobActionFragment,
  WorkbenchJobActivityStatus,
} from 'generated/graphql'
import { useState } from 'react'
import styled, { useTheme } from 'styled-components'
import {
  getActionIcon,
  getActionInputJson,
  getActionResultJson,
  getActionSubtitle,
  getActionTitle,
} from './workbenchJobActionsUtils'

export function WorkbenchJobActionDetail({
  activity,
  onBack,
}: {
  activity: WorkbenchJobActionFragment
  onBack: () => void
}) {
  const theme = useTheme()
  const [error, setError] = useState<string | null>(null)
  const needsApproval =
    activity.status === WorkbenchJobActivityStatus.NeedsApproval
  const icon = getActionIcon(activity)
  const inputJson = getActionInputJson(activity)
  const resultJson = getActionResultJson(activity)

  const [approve, { loading: approving }] =
    useApproveWorkbenchJobActivityMutation({
      variables: { id: activity.id },
      onCompleted: onBack,
      onError: (err) => setError(err.message),
      refetchQueries: ['WorkbenchJobActions', 'WorkbenchJobPendingActions'],
    })

  const [reject, { loading: rejecting }] =
    useRejectWorkbenchJobActivityMutation({
      variables: { id: activity.id },
      onCompleted: onBack,
      onError: (err) => setError(err.message),
      refetchQueries: ['WorkbenchJobActions', 'WorkbenchJobPendingActions'],
    })

  return (
    <DetailSC>
      <BackBtnSC
        type="button"
        onClick={onBack}
      >
        <ArrowLeftIcon size={12} />
        Back to all actions
      </BackBtnSC>

      <Flex
        align="center"
        justify="space-between"
        gap="medium"
      >
        <Flex
          align="center"
          gap="small"
          css={{ minWidth: 0 }}
        >
          <IconFrame
            circle
            size="medium"
            type="secondary"
            icon={icon ?? <KubernetesIcon size={16} />}
            css={{
              flexShrink: 0,
              border: theme.borders['fill-two'],
              backgroundColor: 'transparent',
            }}
          />
          <StackedText
            first={getActionTitle(activity)}
            firstPartialType="body2Bold"
            firstColor="text"
            second={getActionSubtitle(activity)}
            secondColor="text-xlight"
            truncate
            css={{ minWidth: 0 }}
          />
        </Flex>
        <ActionStatusChip status={activity.status} />
      </Flex>

      {error && <GqlError error={error} />}

      {!!inputJson && (
        <Flex
          direction="column"
          gap="xsmall"
        >
          <CaptionP $color="text-xlight">INPUT</CaptionP>
          <Code
            language="json"
            showHeader={false}
          >
            {inputJson}
          </Code>
        </Flex>
      )}

      {!!resultJson && (
        <Flex
          direction="column"
          gap="xsmall"
        >
          <CaptionP $color="text-xlight">
            {activity.status === WorkbenchJobActivityStatus.Failed
              ? 'ERROR'
              : activity.status === WorkbenchJobActivityStatus.Cancelled
                ? 'REASON'
                : 'RESULT'}
          </CaptionP>
          <Code
            language="json"
            showHeader={false}
          >
            {resultJson}
          </Code>
        </Flex>
      )}

      {needsApproval && (
        <ActionsRowSC>
          <Button
            small
            secondary
            loading={rejecting}
            disabled={approving || rejecting}
            onClick={() => {
              setError(null)
              reject()
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
            disabled={approving || rejecting}
            onClick={() => {
              setError(null)
              approve()
            }}
          >
            Approve
          </Button>
        </ActionsRowSC>
      )}
    </DetailSC>
  )
}

function ActionStatusChip({
  status,
}: {
  status: Nullable<WorkbenchJobActivityStatus>
}) {
  switch (status) {
    case WorkbenchJobActivityStatus.NeedsApproval:
      return (
        <Chip
          fillLevel={2}
          iconColor="icon-warning"
          icon={<WarningIcon />}
        >
          Pending approval
        </Chip>
      )
    case WorkbenchJobActivityStatus.Failed:
      return (
        <Chip
          fillLevel={2}
          iconColor="icon-danger"
          icon={<FailedFilledIcon />}
        >
          Failed
        </Chip>
      )
    case WorkbenchJobActivityStatus.Successful:
      return (
        <Chip
          fillLevel={2}
          iconColor="icon-success"
          icon={<StatusOkIcon />}
        >
          Succeeded
        </Chip>
      )
    case WorkbenchJobActivityStatus.Cancelled:
      return <Chip fillLevel={2}>Denied</Chip>
    default:
      return null
  }
}

const DetailSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,
}))

const BackBtnSC = styled.button(({ theme }) => ({
  ...theme.partials.reset.button,
  ...theme.partials.text.body2,
  display: 'inline-flex',
  alignItems: 'center',
  gap: theme.spacing.xsmall,
  color: theme.colors['text-xlight'],
  width: 'fit-content',
  '&:hover': { color: theme.colors.text },
}))

const ActionsRowSC = styled.div({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
})
