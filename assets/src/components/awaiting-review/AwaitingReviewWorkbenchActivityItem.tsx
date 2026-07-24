import {
  Button,
  Chip,
  Flex,
  IconFrame,
  KubernetesIcon,
  WarningOutlineIcon,
} from '@pluralsh/design-system'
import { WorkbenchLinkChip } from 'components/workbenches/common/WorkbenchLinkChip'
import {
  getWorkbenchToolLabel,
  WorkbenchToolIcon,
} from 'components/workbenches/tools/workbenchToolsUtils'
import { StretchedFlex } from 'components/utils/StretchedFlex.tsx'
import { StackedText } from 'components/utils/table/StackedText'
import { Body2P } from 'components/utils/typography/Text'
import {
  AwaitingReviewWorkbenchActivityFragment,
  WorkbenchJobActivityType,
  WorkbenchToolType,
} from 'generated/graphql'
import { Link } from 'react-router-dom'
import { getWorkbenchJobAbsPath } from 'routes/workbenchesRoutesConsts'
import { useTheme } from 'styled-components'

type ActivityTool = NonNullable<
  NonNullable<
    NonNullable<
      AwaitingReviewWorkbenchActivityFragment['result']
    >['functionCall']
  >['tool']
>

type KubeRequest = NonNullable<
  NonNullable<AwaitingReviewWorkbenchActivityFragment['result']>['kubeRequest']
>

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
  const isKubernetes = activity.type === WorkbenchJobActivityType.Kubernetes

  const subtitle = isKubernetes
    ? kubeRequestSubtitle(kubeRequest)
    : toolType
      ? getWorkbenchToolLabel(toolType)
      : (functionCall?.name ?? 'Action')

  const title = isKubernetes
    ? kubernetesTitle(kubeRequest)
    : 'Approval required'

  const description =
    workbenchJob?.result?.workingTheory?.trim() ||
    toolDescription(tool) ||
    activity.prompt?.trim() ||
    null

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
            isKubernetes || !toolType ? (
              <KubernetesIcon size={16} />
            ) : (
              <WorkbenchToolIcon
                type={toolType}
                fullColor
                size={16}
              />
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

      <StretchedFlex
        align="center"
        gap="small"
      >
        <Chip
          size="small"
          iconColor="icon-warning"
          icon={<WarningOutlineIcon />}
        >
          Pending approval
        </Chip>
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

function toolDescription(tool: ActivityTool | null | undefined): string | null {
  if (!tool?.configuration) return null
  const { configuration, tool: toolType } = tool
  switch (toolType) {
    case WorkbenchToolType.Lambda:
      return configuration.lambda?.description?.trim() || null
    case WorkbenchToolType.CloudRun:
      return configuration.cloudRun?.description?.trim() || null
    case WorkbenchToolType.AzureFunction:
      return configuration.azureFunction?.description?.trim() || null
    default:
      return null
  }
}

function kubernetesTitle(kubeRequest: KubeRequest | null | undefined): string {
  const path = kubeRequest?.path?.trim()
  if (!path) return 'Kubernetes action'
  const segments = path.split('/').filter(Boolean)
  const resource = segments.at(-2)
  if (resource) return capitalizeKind(resource)
  return kubeRequest?.method?.toUpperCase() || 'Kubernetes action'
}

function kubeRequestSubtitle(
  kubeRequest: KubeRequest | null | undefined
): string {
  const path = kubeRequest?.path?.trim()
  if (!path) return kubeRequest?.handle || 'Kubernetes'
  return [kubeRequest?.handle, path].filter(Boolean).join(' · ')
}

function capitalizeKind(kind: string) {
  return kind
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}
