import {
  CloudWatchIcon,
  DatadogLogoIcon,
  DocsIcon,
  ElasticsearchLogoIcon,
  GrafanaLogoIcon,
  IconProps,
  LokiLogoIcon,
  PrometheusLogoIcon,
  SplunkLogoIcon,
  TempoLogoIcon,
  VictoriaLogsLogoIcon,
} from '@pluralsh/design-system'
import { upperFirst } from 'lodash'
import { ComponentType } from 'react'

const TOOL_ICONS: { match: RegExp; Icon: ComponentType<IconProps> }[] = [
  { match: /prometheus/i, Icon: PrometheusLogoIcon },
  { match: /grafana/i, Icon: GrafanaLogoIcon },
  { match: /datadog/i, Icon: DatadogLogoIcon },
  { match: /elastic/i, Icon: ElasticsearchLogoIcon },
  { match: /tempo/i, Icon: TempoLogoIcon },
  { match: /loki/i, Icon: LokiLogoIcon },
  { match: /splunk/i, Icon: SplunkLogoIcon },
  { match: /cloud.?watch/i, Icon: CloudWatchIcon },
  { match: /victoria/i, Icon: VictoriaLogsLogoIcon },
]

export function toolDisplayName(tool: string) {
  const words = tool.replace(/[_-]+/g, ' ').trim()
  if (!words) return tool
  return upperFirst(words)
}

export function DashboardToolIcon({
  tool,
  size = 10,
  fallback = false,
}: {
  tool: string
  size?: number
  fallback?: boolean
}) {
  const match = TOOL_ICONS.find(({ match }) => match.test(tool))
  if (!match) return fallback ? <DocsIcon size={size} /> : null
  const { Icon } = match
  return (
    <Icon
      size={size}
      fullColor
    />
  )
}
