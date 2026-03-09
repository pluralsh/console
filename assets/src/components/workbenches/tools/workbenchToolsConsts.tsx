import { WorkbenchToolType } from 'generated/graphql'

export const TOOL_TYPE_LABELS: Record<WorkbenchToolType, string> = {
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

export const TOOL_TYPE_CARDS: {
  type: WorkbenchToolType
  label: string
  description: string
  tags: string[]
}[] = [
  {
    type: WorkbenchToolType.Datadog,
    label: 'Datadog',
    description: 'Connect to Datadog for metrics, logs, and APM.',
    tags: ['Metrics', 'Logs'],
  },
  {
    type: WorkbenchToolType.Elastic,
    label: 'Elasticsearch',
    description: 'Query logs and search data in Elasticsearch.',
    tags: ['Logs'],
  },
  {
    type: WorkbenchToolType.Prometheus,
    label: 'Prometheus',
    description:
      'Query metrics from Prometheus or Prometheus-compatible stores.',
    tags: ['Metrics'],
  },
  {
    type: WorkbenchToolType.Loki,
    label: 'Loki',
    description: 'Query log data from Grafana Loki.',
    tags: ['Logs'],
  },
  {
    type: WorkbenchToolType.Tempo,
    label: 'Tempo',
    description: 'Query trace data from Grafana Tempo for distributed tracing.',
    tags: ['Traces'],
  },
  {
    type: WorkbenchToolType.Http,
    label: 'Custom integration',
    description:
      'Call arbitrary HTTP endpoints. Use for webhooks, REST APIs, and custom integrations.',
    tags: ['Integration'],
  },
]
