import {
  Button,
  Chip,
  Flex,
  IconFrame,
  TrashCanIcon,
  UpdatesIcon,
  WarningOutlineIcon,
} from '@pluralsh/design-system'
import { WorkbenchLinkChip } from 'components/workbenches/common/WorkbenchLinkChip'
import {
  getWorkbenchToolLabel,
  WorkbenchToolIcon,
} from 'components/workbenches/tools/workbenchToolsUtils'
import {
  getKubeActionSubtitle,
  getKubeActionTitle,
  getKubeActionVariant,
  parseKubePath,
} from 'components/workbenches/workbench/job/workbenchJobKubeActionUtils'
import { StretchedFlex } from 'components/utils/StretchedFlex.tsx'
import { StackedText } from 'components/utils/table/StackedText'
import { Body2P, CaptionP } from 'components/utils/typography/Text'
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
  const kubeVariant = isKubernetes
    ? getKubeActionVariant(kubeRequest?.method)
    : null
  const parsedPath = isKubernetes ? parseKubePath(kubeRequest?.path) : null

  const title = isKubernetes
    ? getKubeActionTitle(kubeRequest)
    : 'Approval required'

  const subtitle = isKubernetes
    ? getKubeActionSubtitle(kubeRequest)
    : toolType
      ? getWorkbenchToolLabel(toolType)
      : (functionCall?.name ?? 'Action')

  const description =
    workbenchJob?.result?.workingTheory?.trim() ||
    toolDescription(tool) ||
    activity.prompt?.trim() ||
    null

  const detailLine =
    kubeVariant === 'delete' ? kubeDeleteDetail(parsedPath) : null

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
        <Flex
          align="center"
          gap="xsmall"
          wrap="wrap"
        >
          <Chip
            size="small"
            iconColor="icon-warning"
            icon={<WarningOutlineIcon />}
          >
            Pending approval
          </Chip>
          {kubeVariant === 'update' && (
            <Chip
              size="small"
              severity="info"
            >
              Update
            </Chip>
          )}
          {kubeVariant === 'delete' && (
            <Chip
              size="small"
              severity="danger"
            >
              Delete
            </Chip>
          )}
        </Flex>
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
  return <UpdatesIcon size={16} />
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

function kubeDeleteDetail(
  parsed: ReturnType<typeof parseKubePath>
): string | null {
  if (parsed?.namespace) return `Deleting ns/${parsed.namespace}`
  if (parsed?.name) return `Deleting ${parsed.name}`
  return 'Deleting resource'
}
