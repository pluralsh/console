import {
  CancelledFilledIcon,
  KubernetesIcon,
  StatusIpIcon,
  StatusOkIcon,
  UpdatesIcon,
  WarningIcon,
} from '@pluralsh/design-system'
import {
  getWorkbenchToolDescription,
  getWorkbenchToolLabel,
  WorkbenchToolIcon,
} from 'components/workbenches/tools/workbenchToolsUtils'
import {
  WorkbenchJobActionFragment,
  WorkbenchJobActivityStatus,
  WorkbenchJobActivityType,
} from 'generated/graphql'
import { ComponentType, ReactElement } from 'react'
import { DefaultTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'
import {
  getKubeActionSubtitle,
  getKubeActionTitle,
  getKubeActionVariant,
  toKubeYaml,
} from './workbenchJobKubeActionUtils'

export type WorkbenchJobActionSectionKey =
  'awaiting' | 'pending' | 'running' | 'failed' | 'succeeded' | 'denied'

export const WORKBENCH_JOB_ACTION_REFETCH_QUERIES = [
  'WorkbenchJobActivities',
  'WorkbenchJobActions',
  'WorkbenchJobActionSummary',
  'PendingApprovalWorkbenchActivities',
]

export type WorkbenchJobActionSection = {
  key: WorkbenchJobActionSectionKey
  label: string
  count: number
  actions: WorkbenchJobActionFragment[]
  icon: ReactElement
  iconColor: string
}

const ACTION_TYPES = new Set([
  WorkbenchJobActivityType.Function,
  WorkbenchJobActivityType.Kubernetes,
])

export function isWorkbenchJobAction(
  activity: WorkbenchJobActionFragment
): boolean {
  return !!activity.type && ACTION_TYPES.has(activity.type)
}

export function getActionStatusBorderColor(
  theme: DefaultTheme,
  status: Nullable<WorkbenchJobActivityStatus>
) {
  switch (status) {
    case WorkbenchJobActivityStatus.NeedsApproval:
      return theme.colors['border-warning']
    case WorkbenchJobActivityStatus.Pending:
      return theme.colors['border-input']
    case WorkbenchJobActivityStatus.Running:
      return theme.colors['border-info']
    case WorkbenchJobActivityStatus.Successful:
      return theme.colors['border-success']
    case WorkbenchJobActivityStatus.Failed:
      return theme.colors['border-danger']
    case WorkbenchJobActivityStatus.Cancelled:
    case WorkbenchJobActivityStatus.Rejected:
      return theme.colors['border-input']
    default:
      return theme.colors.border
  }
}

export function getActionSectionKey(
  status: Nullable<WorkbenchJobActivityStatus>
): WorkbenchJobActionSectionKey | null {
  switch (status) {
    case WorkbenchJobActivityStatus.NeedsApproval:
      return 'awaiting'
    case WorkbenchJobActivityStatus.Pending:
      return 'pending'
    case WorkbenchJobActivityStatus.Running:
      return 'running'
    case WorkbenchJobActivityStatus.Failed:
      return 'failed'
    case WorkbenchJobActivityStatus.Successful:
      return 'succeeded'
    case WorkbenchJobActivityStatus.Cancelled:
    case WorkbenchJobActivityStatus.Rejected:
      return 'denied'
    default:
      return null
  }
}

export function groupWorkbenchJobActions(
  activities: WorkbenchJobActionFragment[],
  theme: DefaultTheme
): WorkbenchJobActionSection[] {
  const buckets: Record<
    WorkbenchJobActionSectionKey,
    WorkbenchJobActionFragment[]
  > = {
    awaiting: [],
    pending: [],
    running: [],
    failed: [],
    succeeded: [],
    denied: [],
  }

  for (const activity of activities) {
    if (!isWorkbenchJobAction(activity)) continue
    const key = getActionSectionKey(activity.status)
    if (key) buckets[key].push(activity)
  }

  const meta: Record<
    WorkbenchJobActionSectionKey,
    {
      label: string
      icon: ComponentType<{ size?: number; color?: string }>
      iconColor: string
    }
  > = {
    awaiting: {
      label: 'Awaiting approval',
      icon: WarningIcon,
      iconColor: theme.colors['icon-warning'],
    },
    pending: {
      label: 'Pending',
      icon: StatusIpIcon,
      iconColor: theme.colors['icon-light'],
    },
    running: {
      label: 'Running',
      icon: StatusIpIcon,
      iconColor: theme.colors['icon-light'],
    },
    failed: {
      label: 'Failed',
      icon: CancelledFilledIcon,
      iconColor: theme.colors['icon-danger'],
    },
    succeeded: {
      label: 'Succeeded',
      icon: StatusOkIcon,
      iconColor: theme.colors['icon-success'],
    },
    denied: {
      label: 'Denied',
      icon: CancelledFilledIcon,
      iconColor: theme.colors['icon-light'],
    },
  }

  return (Object.keys(buckets) as WorkbenchJobActionSectionKey[])
    .map((key) => {
      const actions = buckets[key]
      const { label, icon: Icon, iconColor } = meta[key]
      return {
        key,
        label,
        count: actions.length,
        actions,
        icon: (
          <Icon
            size={16}
            color={iconColor}
          />
        ),
        iconColor,
      }
    })
    .filter((section) => section.count > 0)
}

export function getActionDetailButtonLabel(
  activity: Pick<WorkbenchJobActionFragment, 'status' | 'type'>
): string {
  const isKubernetes = activity.type === WorkbenchJobActivityType.Kubernetes

  switch (activity.status) {
    case WorkbenchJobActivityStatus.NeedsApproval:
      return isKubernetes ? 'View diff' : 'View JSON'
    case WorkbenchJobActivityStatus.Failed:
      return 'View error'
    case WorkbenchJobActivityStatus.Successful:
      return isKubernetes ? 'View results' : 'View JSON'
    case WorkbenchJobActivityStatus.Cancelled:
    case WorkbenchJobActivityStatus.Rejected:
      return 'View reason'
    default:
      return 'View details'
  }
}

export function getActionTitle(activity: WorkbenchJobActionFragment): string {
  const toolName = activity.result?.functionCall?.tool?.name?.trim()
  if (toolName) return toolName

  if (activity.type === WorkbenchJobActivityType.Kubernetes) {
    return getKubeActionTitle(activity.result?.kubeRequest)
  }

  return (
    activity.result?.functionCall?.name?.trim() ||
    activity.prompt?.trim() ||
    'Action'
  )
}

export function getActionSubtitle(
  activity: WorkbenchJobActionFragment
): string {
  if (activity.type === WorkbenchJobActivityType.Kubernetes) {
    return getKubeActionSubtitle(activity.result?.kubeRequest)
  }

  const toolType = activity.result?.functionCall?.tool?.tool
  if (toolType) return getWorkbenchToolLabel(toolType)

  return activity.result?.functionCall?.name?.trim() || 'Function'
}

export function getActionDescription(
  activity: WorkbenchJobActionFragment
): string {
  const description = getWorkbenchToolDescription(
    activity.result?.functionCall?.tool
  )
  if (description) return description

  const output = activity.result?.output?.trim()
  if (output && !isPendingApprovalOutput(output)) return output

  const prompt = activity.prompt?.trim()
  if (prompt && !prompt.toLowerCase().startsWith('function call:'))
    return prompt

  return `${getActionTitle(activity)} action`
}

export function getActionIcon(activity: WorkbenchJobActionFragment) {
  if (activity.type === WorkbenchJobActivityType.Kubernetes) {
    return (
      <KubernetesIcon
        size={16}
        color={
          getKubeActionVariant(activity.result?.kubeRequest?.method) ===
          'delete'
            ? 'icon-danger'
            : undefined
        }
      />
    )
  }

  const toolType = activity.result?.functionCall?.tool?.tool
  if (!toolType) return <UpdatesIcon size={16} />

  return (
    <WorkbenchToolIcon
      type={toolType}
      fullColor
      size={16}
    />
  )
}

export function formatActionJson(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2)
    } catch {
      return value
    }
  }
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export function getActionInputJson(
  activity: WorkbenchJobActionFragment
): string {
  const input = activity.result?.functionCall?.input
  if (input != null) return formatActionJson(input)

  const kube = activity.result?.kubeRequest
  if (kube) {
    return formatActionJson({
      handle: kube.handle,
      method: kube.method,
      path: kube.path,
      queryParams: kube.queryParams,
      contentType: kube.contentType,
    })
  }

  return ''
}

const PENDING_APPROVAL_OUTPUTS = new Set([
  'waiting for user approval',
  'request pending user approval',
])

function isPendingApprovalOutput(output: string): boolean {
  return PENDING_APPROVAL_OUTPUTS.has(output.trim())
}

export function getActionResultJson(
  activity: WorkbenchJobActionFragment
): string {
  if (activity.result?.error?.trim()) {
    return activity.result.error.trim()
  }
  const output = activity.result?.output
  if (output == null || isPendingApprovalOutput(String(output))) return ''
  if (activity.type === WorkbenchJobActivityType.Kubernetes) {
    return toKubeYaml(output)
  }
  return formatActionJson(output)
}

export function getActionResultLanguage(
  activity: WorkbenchJobActionFragment
): 'json' | 'yaml' {
  return activity.type === WorkbenchJobActivityType.Kubernetes &&
    !activity.result?.error?.trim()
    ? 'yaml'
    : 'json'
}

export function mapActionNodes(
  edges: Nullable<Nullable<{ node?: Nullable<WorkbenchJobActionFragment> }>[]>
): WorkbenchJobActionFragment[] {
  return (edges?.map((edge) => edge?.node).filter(isNonNullable) ?? []).filter(
    isWorkbenchJobAction
  )
}
