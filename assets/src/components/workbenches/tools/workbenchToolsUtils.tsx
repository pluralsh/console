import {
  AtlassianLogoIcon,
  DatadogLogoIcon,
  DynatraceLogoIcon,
  ElasticsearchLogoIcon,
  IconProps,
  LinearLogoIcon,
  LokiLogoIcon,
  PrometheusLogoIcon,
  SplunkLogoIcon,
  TempoLogoIcon,
  ToolsIcon,
} from '@pluralsh/design-system'
import {
  WorkbenchToolCategory,
  WorkbenchToolConfigurationAttributes,
  WorkbenchToolType,
} from 'generated/graphql'
import { ComponentType, type CSSProperties } from 'react'
import styled from 'styled-components'

/** Tool types that have a configuration branch in WorkbenchToolConfigurationAttributes and editable forms. */
const CONFIGURABLE_WORKBENCH_TOOL_TYPES = [
  WorkbenchToolType.Datadog,
  WorkbenchToolType.Elastic,
  WorkbenchToolType.Http,
  WorkbenchToolType.Loki,
  WorkbenchToolType.Prometheus,
  WorkbenchToolType.Tempo,
  WorkbenchToolType.Atlassian,
  WorkbenchToolType.Linear,
  WorkbenchToolType.Splunk,
  WorkbenchToolType.Dynatrace,
  WorkbenchToolType.Cloudwatch,
] as const

const CONFIGURABLE_SET = new Set<WorkbenchToolType>(
  CONFIGURABLE_WORKBENCH_TOOL_TYPES
)
export type ConfigurableWorkbenchToolType =
  (typeof CONFIGURABLE_WORKBENCH_TOOL_TYPES)[number]

/** map configurable tool type -> config key in WorkbenchToolConfigurationAttributes. */
export const CONFIGURABLE_TOOL_TYPE_TO_CONFIG_KEY = {
  [WorkbenchToolType.Http]: 'http',
  [WorkbenchToolType.Elastic]: 'elastic',
  [WorkbenchToolType.Prometheus]: 'prometheus',
  [WorkbenchToolType.Loki]: 'loki',
  [WorkbenchToolType.Tempo]: 'tempo',
  [WorkbenchToolType.Datadog]: 'datadog',
  [WorkbenchToolType.Linear]: 'linear',
  [WorkbenchToolType.Atlassian]: 'atlassian',
  [WorkbenchToolType.Splunk]: 'splunk',
  [WorkbenchToolType.Dynatrace]: 'dynatrace',
  [WorkbenchToolType.Cloudwatch]: 'cloudwatch',
} as const satisfies Record<
  ConfigurableWorkbenchToolType,
  keyof WorkbenchToolConfigurationAttributes
>

/** The non-nullable inner config type for a given configurable tool type. */
export type ConfigForToolType<T extends ConfigurableWorkbenchToolType> =
  NonNullable<
    WorkbenchToolConfigurationAttributes[(typeof CONFIGURABLE_TOOL_TYPE_TO_CONFIG_KEY)[T]]
  >

export const isConfigurableWorkbenchToolType = (
  type: Nullable<string>
): type is ConfigurableWorkbenchToolType =>
  !!type && CONFIGURABLE_SET.has(type as WorkbenchToolType)

export const TOOL_TYPE_TO_LABEL: Record<WorkbenchToolType, string> = {
  [WorkbenchToolType.Http]: 'HTTP',
  [WorkbenchToolType.Elastic]: 'Elasticsearch',
  [WorkbenchToolType.Prometheus]: 'Prometheus',
  [WorkbenchToolType.Loki]: 'Loki',
  [WorkbenchToolType.Tempo]: 'Tempo',
  [WorkbenchToolType.Datadog]: 'Datadog',
  [WorkbenchToolType.Atlassian]: 'Atlassian',
  [WorkbenchToolType.Linear]: 'Linear',
  [WorkbenchToolType.Mcp]: 'MCP',
  [WorkbenchToolType.Sentry]: 'Sentry',
  [WorkbenchToolType.Splunk]: 'Splunk',
  [WorkbenchToolType.Dynatrace]: 'Dynatrace',
  [WorkbenchToolType.Cloudwatch]: 'Cloudwatch',
}

export const TOOL_TYPE_TO_CATEGORIES: Record<
  WorkbenchToolType,
  WorkbenchToolCategory[]
> = {
  [WorkbenchToolType.Datadog]: [
    WorkbenchToolCategory.Metrics,
    WorkbenchToolCategory.Logs,
  ],
  [WorkbenchToolType.Elastic]: [WorkbenchToolCategory.Logs],
  [WorkbenchToolType.Prometheus]: [WorkbenchToolCategory.Metrics],
  [WorkbenchToolType.Loki]: [WorkbenchToolCategory.Logs],
  [WorkbenchToolType.Tempo]: [WorkbenchToolCategory.Traces],
  [WorkbenchToolType.Atlassian]: [WorkbenchToolCategory.Ticketing],
  [WorkbenchToolType.Linear]: [WorkbenchToolCategory.Ticketing],
  [WorkbenchToolType.Http]: [WorkbenchToolCategory.Integration],
  [WorkbenchToolType.Mcp]: [],
  [WorkbenchToolType.Sentry]: [WorkbenchToolCategory.ErrorTracking],
  [WorkbenchToolType.Splunk]: [WorkbenchToolCategory.Logs],
  [WorkbenchToolType.Dynatrace]: [
    WorkbenchToolCategory.Metrics,
    WorkbenchToolCategory.Logs,
    WorkbenchToolCategory.Traces,
  ],
  [WorkbenchToolType.Cloudwatch]: [
    WorkbenchToolCategory.Metrics,
    WorkbenchToolCategory.Logs,
  ],
}

/** Descriptions for configurable tool types (create cards). Single source for supported types + copy. */
const CONFIGURABLE_TOOL_TYPE_CARD_DESCRIPTIONS: Record<
  ConfigurableWorkbenchToolType,
  string
> = {
  [WorkbenchToolType.Datadog]: 'Connect to Datadog for metrics, logs, and APM.',
  [WorkbenchToolType.Elastic]: 'Query logs and search data in Elasticsearch.',
  [WorkbenchToolType.Prometheus]:
    'Query metrics from Prometheus or Prometheus-compatible stores.',
  [WorkbenchToolType.Loki]: 'Query log data from Grafana Loki.',
  [WorkbenchToolType.Tempo]:
    'Query trace data from Grafana Tempo for distributed tracing.',
  [WorkbenchToolType.Atlassian]:
    'Connect to Jira, Confluence, and other Atlassian products.',
  [WorkbenchToolType.Linear]:
    'Connect to Linear for issue tracking and project management.',
  [WorkbenchToolType.Http]:
    'Call arbitrary HTTP endpoints- useful for custom integrations.',
  [WorkbenchToolType.Splunk]: 'Query logs and search data in Splunk.',
  [WorkbenchToolType.Dynatrace]:
    'Query metrics, logs, and traces from Dynatrace.',
  [WorkbenchToolType.Cloudwatch]: 'Query metrics and logs from CloudWatch.',
}

export const categoryToLabel: Record<WorkbenchToolCategory, string> = {
  [WorkbenchToolCategory.Metrics]: 'Metrics',
  [WorkbenchToolCategory.Logs]: 'Logs',
  [WorkbenchToolCategory.Traces]: 'Traces',
  [WorkbenchToolCategory.Ticketing]: 'Ticketing',
  [WorkbenchToolCategory.Integration]: 'Integration',
  [WorkbenchToolCategory.ErrorTracking]: 'Error tracking',
}

export const TOOL_TYPE_CARDS: {
  type: ConfigurableWorkbenchToolType
  description: string
  label: string
  categoryLabels: string[]
}[] = CONFIGURABLE_WORKBENCH_TOOL_TYPES.map((type) => ({
  type,
  description: CONFIGURABLE_TOOL_TYPE_CARD_DESCRIPTIONS[type],
  label: TOOL_TYPE_TO_LABEL[type],
  categoryLabels: TOOL_TYPE_TO_CATEGORIES[type].map(
    (category) => categoryToLabel[category]
  ),
}))

export function WorkbenchToolIcon({
  type,
  fullColor = true,
  ...props
}: { type: Nullable<string> } & IconProps) {
  if (!isConfigurableWorkbenchToolType(type)) return <ToolsIcon {...props} />
  const Icon = toolToIcon[type]
  return (
    <Icon
      fullColor={fullColor}
      {...props}
    />
  )
}

export const WorkbenchToolCardBody = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  boxSizing: 'border-box',
  width: '100%',
  minWidth: 0,
  minHeight: 0,
  flex: 1,
  padding: theme.spacing.large,
}))

export function workbenchToolCardGridStyles(
  minColumnWidthPx: number
): CSSProperties {
  return {
    gridTemplateColumns: `repeat(auto-fill, minmax(${minColumnWidthPx}px, 1fr))`,
    gridAutoRows: 'minmax(min-content, auto)',
  }
}

const toolToIcon: Record<
  ConfigurableWorkbenchToolType,
  ComponentType<IconProps>
> = {
  [WorkbenchToolType.Datadog]: DatadogLogoIcon,
  [WorkbenchToolType.Elastic]: ElasticsearchLogoIcon,
  [WorkbenchToolType.Loki]: LokiLogoIcon,
  [WorkbenchToolType.Prometheus]: PrometheusLogoIcon,
  [WorkbenchToolType.Tempo]: TempoLogoIcon,
  [WorkbenchToolType.Http]: ToolsIcon,
  [WorkbenchToolType.Atlassian]: AtlassianLogoIcon,
  [WorkbenchToolType.Linear]: LinearLogoIcon,
  [WorkbenchToolType.Splunk]: SplunkLogoIcon,
  [WorkbenchToolType.Dynatrace]: DynatraceLogoIcon,
  [WorkbenchToolType.Cloudwatch]: ToolsIcon,
}
