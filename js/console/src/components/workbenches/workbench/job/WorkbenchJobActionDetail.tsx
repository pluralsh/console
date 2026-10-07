import {
  Button,
  Code,
  Flex,
  IconFrame,
  KubernetesIcon,
  ReturnIcon,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { StackedText } from 'components/utils/table/StackedText'
import { CaptionP } from 'components/utils/typography/Text'
import {
  useApproveWorkbenchJobActivityMutation,
  useRejectWorkbenchJobActivityMutation,
  WorkbenchJobActionFragment,
  WorkbenchJobActivityStatus,
  WorkbenchJobActivityType,
} from 'generated/graphql'
import { useState } from 'react'
import styled, { useTheme } from 'styled-components'
import {
  getActionIcon,
  getActionInputJson,
  getActionResultJson,
  getActionResultLanguage,
  getActionSubtitle,
  getActionTitle,
  WORKBENCH_JOB_ACTION_REFETCH_QUERIES,
} from './workbenchJobActionsUtils'
import { getKubeActionVariant } from './workbenchJobKubeActionUtils'
import {
  WorkbenchJobKubeActionChips,
  WorkbenchJobKubeDrainDetails,
  WorkbenchJobKubeUpdateDiff,
} from './WorkbenchJobKubeUpdateDiff'
import { WorkbenchJobActionDenialResult } from './WorkbenchJobActionDenialResult'
import { WorkbenchJobActionDenyButton } from './WorkbenchJobActionDenyPopover'
import { WorkbenchJobActionStatusChip } from './WorkbenchJobActionStatusChip'
import { WorkbenchJobActionDetails } from './WorkbenchJobActionDetails'
import { WorkbenchJobExecDetails } from './WorkbenchJobExecDetails'

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
  const isKubernetes = activity.type === WorkbenchJobActivityType.Kubernetes
  const isExec = activity.type === WorkbenchJobActivityType.Exec
  const kubeRequest = activity.result?.kubeRequest
  const kubeDrain = activity.result?.kubeDrain
  const kubeVariant = getKubeActionVariant(kubeRequest?.method)
  const isKubeDrain = isKubernetes && !!kubeDrain
  const isKubeDiff =
    isKubernetes &&
    needsApproval &&
    (kubeVariant === 'create' ||
      kubeVariant === 'update' ||
      kubeVariant === 'delete')
  const icon = getActionIcon(activity)
  const inputJson = getActionInputJson(activity)
  const isDenied =
    activity.status === WorkbenchJobActivityStatus.Cancelled ||
    activity.status === WorkbenchJobActivityStatus.Rejected
  const resultJson = isDenied ? '' : getActionResultJson(activity)
  const resultLanguage = getActionResultLanguage(activity)

  const [approve, { loading: approving }] =
    useApproveWorkbenchJobActivityMutation({
      variables: { id: activity.id },
      onCompleted: onBack,
      onError: (err) => setError(err.message),
      refetchQueries: WORKBENCH_JOB_ACTION_REFETCH_QUERIES,
    })

  const [reject, { loading: rejecting, error: rejectError }] =
    useRejectWorkbenchJobActivityMutation({
      onCompleted: onBack,
      refetchQueries: WORKBENCH_JOB_ACTION_REFETCH_QUERIES,
    })

  return (
    <DetailSC>
      <BackBtnSC
        type="button"
        onClick={onBack}
      >
        <ReturnIcon size={12} />
        Back to all actions
      </BackBtnSC>

      <HeaderBlockSC>
        <Flex
          align="center"
          justify="space-between"
          gap="medium"
        >
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
              css={{ minWidth: 0, flex: 1 }}
            />
          </Flex>
          <WorkbenchJobKubeActionChips
            type={activity.type}
            method={kubeRequest?.method}
            drain={!!kubeDrain}
            statusChip={
              <WorkbenchJobActionStatusChip status={activity.status} />
            }
          />
        </Flex>
        <WorkbenchJobActionDetails activity={activity} />
      </HeaderBlockSC>

      {error && <GqlError error={error} />}

      {isKubeDrain ? (
        <WorkbenchJobKubeDrainDetails
          node={kubeDrain?.node}
          explanation={kubeDrain?.explanation ?? activity.result?.explanation}
        />
      ) : isKubeDiff ? (
        <WorkbenchJobKubeUpdateDiff
          activityId={activity.id}
          kubeRequest={activity.result?.kubeRequest}
          enabled
        />
      ) : isExec ? (
        <WorkbenchJobExecDetails
          activity={activity}
          enabled
        />
      ) : (
        <>
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
            </Flex>
          )}
        </>
      )}

      <WorkbenchJobActionDenialResult activity={activity} />

      {needsApproval && (
        <ActionsRowSC>
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
        </ActionsRowSC>
      )}
    </DetailSC>
  )
}

const DetailSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,
}))

const HeaderBlockSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
  minWidth: 0,
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
