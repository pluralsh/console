import {
  Button,
  Chip,
  CommandIcon,
  Flex,
  IconFrame,
  TrashCanIcon,
  UpdatesIcon,
  WarningOutlineIcon,
} from '@pluralsh/design-system'
import { WorkbenchLinkChip } from 'components/workbenches/common/WorkbenchLinkChip'
import {
  getWorkbenchToolDescription,
  getWorkbenchToolLabel,
  WorkbenchToolIcon,
} from 'components/workbenches/tools/workbenchToolsUtils'
import { WorkbenchJobKubeActionChips } from 'components/workbenches/workbench/job/WorkbenchJobKubeUpdateDiff'
import {
  getKubeActionSubtitle,
  getKubeActionTitle,
  getKubeActionVariant,
  getKubeDeleteResourceLabel,
} from 'components/workbenches/workbench/job/workbenchJobKubeActionUtils'
import { StretchedFlex } from 'components/utils/StretchedFlex.tsx'
import { StackedText } from 'components/utils/table/StackedText'
import { Body2P, CaptionP } from 'components/utils/typography/Text'
import {
  AwaitingReviewWorkbenchActivityFragment,
  WorkbenchJobActivityType,
} from 'generated/graphql'
import { Link } from 'react-router-dom'
import { getWorkbenchJobAbsPath } from 'routes/workbenchesRoutesConsts'
import { useTheme } from 'styled-components'

export function AwaitingReviewWorkbenchActivityItem({
  activity,
  onNavigate,
}: {
  activity: AwaitingReviewWorkbenchActivityFragment
  onNavigate: () => void
}) {
  const theme = useTheme()
  const { workbenchJob, result } = activity
  const workbench = workbenchJob?.workbench
  const functionCall = result?.functionCall
  const tool = functionCall?.tool
  const toolType = tool?.tool
  const kubeRequest = result?.kubeRequest
  const kubeDrain = result?.kubeDrain
  const kubeExec = result?.kubeExec
  const isKubernetes = activity.type === WorkbenchJobActivityType.Kubernetes
  const isExec = activity.type === WorkbenchJobActivityType.Exec
  const kubeVariant = isKubernetes
    ? getKubeActionVariant(kubeRequest?.method, !!kubeDrain)
    : null

  const title = isKubernetes
    ? kubeDrain
      ? 'Drain node'
      : getKubeActionTitle(kubeRequest)
    : isExec
      ? kubeExec?.pod?.trim() || 'Pod command'
      : tool?.name?.trim() || functionCall?.name?.trim() || 'Approval required'

  const subtitle = isKubernetes
    ? kubeDrain
      ? [kubeDrain.handle, kubeDrain.node].filter(Boolean).join(' · ')
      : getKubeActionSubtitle(kubeRequest)
    : isExec
      ? [kubeExec?.handle, kubeExec?.namespace, kubeExec?.container]
          .filter(Boolean)
          .join(' · ')
      : toolType
        ? getWorkbenchToolLabel(toolType)
        : (functionCall?.name ?? 'Action')

  const description =
    workbenchJob?.result?.workingTheory?.trim() ||
    kubeDrain?.explanation?.trim() ||
    getWorkbenchToolDescription(tool) ||
    activity.prompt?.trim() ||
    null

  const detailLine =
    kubeVariant === 'delete'
      ? `Deleting ${getKubeDeleteResourceLabel(kubeRequest)}`
      : kubeVariant === 'drain'
        ? `Draining ${kubeDrain?.node}`
        : null

  const viewPath =
    workbenchJob?.id && workbench?.id
      ? getWorkbenchJobAbsPath({
          workbenchId: workbench.id,
          jobId: workbenchJob.id,
        })
      : null

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.medium,
        padding: theme.spacing.large,
      }}
    >
      <Flex
        align="center"
        gap="medium"
      >
        <IconFrame
          circle
          size="large"
          type="secondary"
          icon={
            isKubernetes ? (
              <KubeActionIcon variant={kubeVariant} />
            ) : isExec ? (
              <CommandIcon size={16} />
            ) : toolType ? (
              <WorkbenchToolIcon
                type={toolType}
                fullColor
                size={16}
              />
            ) : (
              <UpdatesIcon size={16} />
            )
          }
          css={{
            flexShrink: 0,
            border: theme.borders['fill-two'],
            backgroundColor: 'transparent',
          }}
        />
        <StackedText
          first={title}
          firstPartialType="body2Bold"
          firstColor="text"
          second={subtitle}
          truncate
          css={{ flex: 1, minWidth: 0 }}
        />
        {workbenchJob?.id && workbench?.id && workbench.name && (
          <WorkbenchLinkChip
            workbenchId={workbench.id}
            workbenchName={workbench.name}
            workbenchJobId={workbenchJob.id}
            jobInsertedAt={workbenchJob.insertedAt}
            onNavigate={onNavigate}
            css={{ flexShrink: 0 }}
          />
        )}
      </Flex>

      {(description || detailLine) && (
        <Flex
          direction="column"
          gap="xsmall"
        >
          {description && (
            <Body2P
              $color="text-light"
              css={{
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {description}
            </Body2P>
          )}
          {detailLine && <CaptionP $color="text-xlight">{detailLine}</CaptionP>}
        </Flex>
      )}

      <StretchedFlex
        align="center"
        gap="small"
      >
        <WorkbenchJobKubeActionChips
          type={activity.type}
          method={kubeRequest?.method}
          drain={!!kubeDrain}
          statusChip={
            <Chip
              size="small"
              iconColor="icon-warning"
              icon={<WarningOutlineIcon />}
            >
              Pending approval
            </Chip>
          }
        />
        {viewPath && (
          <Button
            small
            as={Link}
            to={viewPath}
            onClick={onNavigate}
          >
            View workbench
          </Button>
        )}
      </StretchedFlex>
    </div>
  )
}

function KubeActionIcon({
  variant,
}: {
  variant: ReturnType<typeof getKubeActionVariant> | null
}) {
  if (variant === 'delete') {
    return (
      <TrashCanIcon
        size={16}
        color="icon-danger"
      />
    )
  }
  if (variant === 'drain') return <WarningOutlineIcon size={16} />
  return <UpdatesIcon size={16} />
}
