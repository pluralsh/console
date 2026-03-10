import {
  WorkbenchToolCategory,
  WorkbenchToolConfigurationAttributes,
  WorkbenchToolType,
} from 'generated/graphql'

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
