import { WorkbenchToolCategory, WorkbenchToolType } from 'generated/graphql'

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

export const TOOL_TYPE_CARDS: {
  type: WorkbenchToolType
  description: string
}[] = [
  {
    type: WorkbenchToolType.Datadog,
    description: 'Connect to Datadog for metrics, logs, and APM.',
  },
  {
    type: WorkbenchToolType.Elastic,
    description: 'Query logs and search data in Elasticsearch.',
  },
  {
    type: WorkbenchToolType.Prometheus,
    description:
      'Query metrics from Prometheus or Prometheus-compatible stores.',
  },
  {
    type: WorkbenchToolType.Loki,
    description: 'Query log data from Grafana Loki.',
  },
  {
    type: WorkbenchToolType.Tempo,
    description: 'Query trace data from Grafana Tempo for distributed tracing.',
  },
  {
    type: WorkbenchToolType.Atlassian,
    description: 'Connect to Jira, Confluence, and other Atlassian products.',
  },
  {
    type: WorkbenchToolType.Linear,
    description: 'Connect to Linear for issue tracking and project management.',
  },
  {
    type: WorkbenchToolType.Http,
    description:
      'Call arbitrary HTTP endpoints- useful for custom integrations.',
  },
]
