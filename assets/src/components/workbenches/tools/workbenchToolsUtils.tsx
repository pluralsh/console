import {
  AtlassianLogoIcon,
  AwsLogoIcon,
  AzureLogoIcon,
  DatadogLogoIcon,
  DynatraceLogoIcon,
  ElasticsearchLogoIcon,
  GoogleCloudLogoIcon,
  IconProps,
  LinearLogoIcon,
  LokiLogoIcon,
  PrometheusLogoIcon,
  SentryLogoIcon,
  SplunkLogoIcon,
  TempoLogoIcon,
  ToolsIcon,
} from '@pluralsh/design-system'
import {
  Provider,
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
  WorkbenchToolType.Jaeger,
  WorkbenchToolType.Atlassian,
  WorkbenchToolType.Linear,
  WorkbenchToolType.Splunk,
  WorkbenchToolType.Dynatrace,
  WorkbenchToolType.Cloudwatch,
  WorkbenchToolType.Azure,
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
  [WorkbenchToolType.Jaeger]: 'jaeger',
  [WorkbenchToolType.Datadog]: 'datadog',
  [WorkbenchToolType.Linear]: 'linear',
  [WorkbenchToolType.Atlassian]: 'atlassian',
  [WorkbenchToolType.Splunk]: 'splunk',
  [WorkbenchToolType.Dynatrace]: 'dynatrace',
  [WorkbenchToolType.Cloudwatch]: 'cloudwatch',
  [WorkbenchToolType.Azure]: 'azure',
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
  [WorkbenchToolType.Azure]: 'Azure',
  [WorkbenchToolType.Jaeger]: 'Jaeger',
  [WorkbenchToolType.Cloud]: 'Cloud',
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
  [WorkbenchToolType.Azure]: [
    WorkbenchToolCategory.Metrics,
    WorkbenchToolCategory.Logs,
  ],
  [WorkbenchToolType.Jaeger]: [WorkbenchToolCategory.Traces],
  [WorkbenchToolType.Cloud]: [WorkbenchToolCategory.Infrastructure],
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
  [WorkbenchToolType.Azure]:
    'Query Azure Monitor metrics and logs for Azure resources.',
  [WorkbenchToolType.Jaeger]:
    'Query distributed traces from Jaeger with structured filters.',
}

export const categoryToLabel: Record<WorkbenchToolCategory, string> = {
  [WorkbenchToolCategory.Metrics]: 'Metrics',
  [WorkbenchToolCategory.Logs]: 'Logs',
  [WorkbenchToolCategory.Traces]: 'Traces',
  [WorkbenchToolCategory.Ticketing]: 'Ticketing',
  [WorkbenchToolCategory.Integration]: 'Integration',
  [WorkbenchToolCategory.ErrorTracking]: 'Error tracking',
  [WorkbenchToolCategory.Infrastructure]: 'Infrastructure',
}

type WorkbenchToolCard = {
  type: WorkbenchToolType
  provider?: Provider
  label: string
  description: string
  categoryLabels: string[]
}

export const WORKBENCH_TOOL_CARDS: WorkbenchToolCard[] = [
  {
    type: WorkbenchToolType.Cloud,
    provider: Provider.Aws,
    label: 'AWS',
    description:
      'Query AWS infrastructure (EC2, S3, RDS, and more) via CloudQuery.',
    categoryLabels: [categoryToLabel[WorkbenchToolCategory.Infrastructure]],
  },
  {
    type: WorkbenchToolType.Cloud,
    provider: Provider.Gcp,
    label: 'GCP',
    description:
      'Query Google Cloud infrastructure (Compute, Storage, BigQuery, and more) via CloudQuery.',
    categoryLabels: [categoryToLabel[WorkbenchToolCategory.Infrastructure]],
  },
  {
    type: WorkbenchToolType.Cloud,
    provider: Provider.Azure,
    label: 'Azure',
    description:
      'Query Azure infrastructure (VMs, storage accounts, resource groups, and more) via CloudQuery.',
    categoryLabels: [categoryToLabel[WorkbenchToolCategory.Infrastructure]],
  },
  ...CONFIGURABLE_WORKBENCH_TOOL_TYPES.map((type) => ({
    type,
    description: CONFIGURABLE_TOOL_TYPE_CARD_DESCRIPTIONS[type],
    label: TOOL_TYPE_TO_LABEL[type],
    categoryLabels: TOOL_TYPE_TO_CATEGORIES[type].map(
      (category) => categoryToLabel[category]
    ),
  })),
]

export const PROVIDER_TO_ICON: Record<Provider, ComponentType<IconProps>> = {
  [Provider.Aws]: AwsLogoIcon,
  [Provider.Gcp]: GoogleCloudLogoIcon,
  [Provider.Azure]: AzureLogoIcon,
}

export const PROVIDER_TO_LABEL: Record<Provider, string> = {
  [Provider.Aws]: 'AWS',
  [Provider.Gcp]: 'GCP',
  [Provider.Azure]: 'Azure',
}

export const isProvider = (value: Nullable<string>): value is Provider =>
  !!value && (Object.values(Provider) as string[]).includes(value)

export function WorkbenchToolIcon({
  type,
  provider,
  fullColor = true,
  ...props
}: {
  type: Nullable<string>
  provider?: Nullable<Provider>
} & IconProps) {
  const Icon =
    type === WorkbenchToolType.Cloud && provider
      ? PROVIDER_TO_ICON[provider]
      : type === WorkbenchToolType.Sentry
        ? SentryLogoIcon
        : isConfigurableWorkbenchToolType(type)
          ? toolToIcon[type]
          : ToolsIcon
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
  padding: theme.spacing.medium,
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
  [WorkbenchToolType.Cloudwatch]: AwsLogoIcon,
  [WorkbenchToolType.Azure]: AzureLogoIcon,
  [WorkbenchToolType.Jaeger]: ToolsIcon,
}
