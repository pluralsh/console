import {
  DatadogLogoIcon,
  ElasticsearchLogoIcon,
  IconProps,
  LokiLogoIcon,
  TempoLogoIcon,
  PrometheusLogoIcon,
  ToolsIcon,
} from '@pluralsh/design-system'
import { WorkbenchToolType } from 'generated/graphql'
import { ComponentType } from 'react'

const TOOL_TYPES: Nullable<string>[] = Object.values(WorkbenchToolType)

export function WorkbenchTool() {
  return <div>WorkbenchTool</div>
}

export function WorkbenchToolIcon({
  type,
  fullColor = true,
  ...props
}: { type: Nullable<string> } & IconProps) {
  if (!isWorkbenchTool(type)) return <ToolsIcon {...props} />
  const Icon = toolToIcon[type]
  return (
    <Icon
      fullColor={fullColor}
      {...props}
    />
  )
}
export const isWorkbenchTool = (
  type: Nullable<string>
): type is WorkbenchToolType => TOOL_TYPES.includes(type)

const toolToIcon: Record<WorkbenchToolType, ComponentType<IconProps>> = {
  [WorkbenchToolType.Datadog]: DatadogLogoIcon,
  [WorkbenchToolType.Elastic]: ElasticsearchLogoIcon,
  [WorkbenchToolType.Loki]: LokiLogoIcon,
  [WorkbenchToolType.Prometheus]: PrometheusLogoIcon,
  [WorkbenchToolType.Tempo]: TempoLogoIcon,
  [WorkbenchToolType.Http]: ToolsIcon,
} satisfies Record<WorkbenchToolType, ComponentType<IconProps>>
