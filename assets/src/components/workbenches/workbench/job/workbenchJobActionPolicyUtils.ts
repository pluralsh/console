import {
  WorkbenchJobActionFragment,
  WorkbenchJobActivityType,
} from 'generated/graphql'
import { getKubeActionVariant } from './workbenchJobKubeActionUtils'

export function getActionPolicyToolName(
  activity: WorkbenchJobActionFragment
): string | undefined {
  if (activity.type === WorkbenchJobActivityType.Kubernetes) {
    const variant = getKubeActionVariant(activity.result?.kubeRequest?.method)
    if (variant === 'delete') return 'delete_k8s_resource'
    if (variant === 'create' || variant === 'update')
      return 'update_k8s_resource'
    return undefined
  }

  if (activity.type === WorkbenchJobActivityType.Exec) return 'exec_k8s_pod'

  const tool = activity.result?.functionCall?.tool
  const toolName = tool?.name?.trim()
  if (tool?.tool && toolName)
    return `${tool.tool.toLowerCase()}_function_call_${toolName}`

  return activity.result?.functionCall?.name?.trim() || undefined
}
