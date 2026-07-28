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

type KubeRequest = NonNullable<
  NonNullable<AwaitingReviewWorkbenchActivityFragment['result']>['kubeRequest']
>

type KubeActionVariant = 'update' | 'delete' | 'other'

type ParsedKubePath = {
  namespace?: string
  resource?: string
  name?: string
}

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
    ? kubernetesTitle(kubeRequest, kubeVariant, parsedPath)
    : 'Approval required'

  const subtitle = isKubernetes
    ? kubeRequestSubtitle(kubeRequest, kubeVariant, parsedPath)
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

function KubeActionIcon({ variant }: { variant: KubeActionVariant | null }) {
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

function getKubeActionVariant(
  method: string | null | undefined
): KubeActionVariant {
  switch (method?.toLowerCase()) {
    case 'delete':
      return 'delete'
    case 'put':
    case 'patch':
    case 'post':
      return 'update'
    default:
      return 'other'
  }
}

function parseKubePath(path: string | null | undefined): ParsedKubePath | null {
  if (!path?.trim()) return null
  const segments = path.split('/').filter(Boolean)
  const nsIdx = segments.indexOf('namespaces')
  if (nsIdx >= 0) {
    return {
      namespace: segments[nsIdx + 1],
      resource: segments[nsIdx + 2],
      name: segments[nsIdx + 3],
    }
  }
  if (segments.length >= 2) {
    return {
      resource: segments.at(-2),
      name: segments.at(-1),
    }
  }
  return null
}

function kubernetesTitle(
  kubeRequest: KubeRequest | null | undefined,
  variant: KubeActionVariant | null,
  parsed: ParsedKubePath | null
): string {
  const kind = formatKindLabel(parsed?.resource)
  if (variant === 'delete' && kind && parsed?.name) {
    return `${kind}/${parsed.name}`
  }
  if (kind) return kind
  return kubeRequest?.method?.toUpperCase() || 'Kubernetes action'
}

function kubeRequestSubtitle(
  kubeRequest: KubeRequest | null | undefined,
  variant: KubeActionVariant | null,
  parsed: ParsedKubePath | null
): string {
  const nsLabel = parsed?.namespace ? `ns/${parsed.namespace}` : null

  if (variant === 'delete') {
    return (
      [nsLabel, kubeRequest?.handle].filter(Boolean).join(' · ') ||
      kubeRequest?.handle ||
      'Kubernetes'
    )
  }

  if (variant === 'update') {
    const resourcePath =
      parsed?.resource && parsed?.name
        ? `${parsed.resource}/${parsed.name}`
        : parsed?.resource
    return (
      [nsLabel, resourcePath].filter(Boolean).join(' · ') ||
      kubeRequest?.handle ||
      'Kubernetes'
    )
  }

  const path = kubeRequest?.path?.trim()
  if (!path) return kubeRequest?.handle || 'Kubernetes'
  return [kubeRequest?.handle, path].filter(Boolean).join(' · ')
}

function kubeDeleteDetail(parsed: ParsedKubePath | null): string | null {
  if (parsed?.namespace) return `Deleting ns/${parsed.namespace}`
  if (parsed?.name) return `Deleting ${parsed.name}`
  return 'Deleting resource'
}

function formatKindLabel(resource: string | undefined): string | undefined {
  if (!resource) return undefined
  return resource
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}
