import {
  IssueWebhookProvider,
  ObservabilityWebhookType,
} from 'generated/graphql'

const OBSERVABILITY_WEBHOOK_TYPE_LABELS: Record<
  ObservabilityWebhookType,
  string
> = {
  [ObservabilityWebhookType.Datadog]: 'Datadog',
  [ObservabilityWebhookType.Grafana]: 'Grafana',
  [ObservabilityWebhookType.Newrelic]: 'New Relic',
  [ObservabilityWebhookType.Pagerduty]: 'PagerDuty',
  [ObservabilityWebhookType.Plural]: 'Plural',
  [ObservabilityWebhookType.Sentry]: 'Sentry',
}

const ISSUE_WEBHOOK_PROVIDER_LABELS: Record<IssueWebhookProvider, string> = {
  [IssueWebhookProvider.Asana]: 'Asana',
  [IssueWebhookProvider.AzureDevops]: 'Azure DevOps',
  [IssueWebhookProvider.Github]: 'GitHub',
  [IssueWebhookProvider.Gitlab]: 'GitLab',
  [IssueWebhookProvider.Jira]: 'Jira',
  [IssueWebhookProvider.Linear]: 'Linear',
}

export function humanizeObservabilityWebhookType(
  type: ObservabilityWebhookType
): string {
  return OBSERVABILITY_WEBHOOK_TYPE_LABELS[type]
}

export function humanizeIssueWebhookProvider(
  provider: IssueWebhookProvider
): string {
  return ISSUE_WEBHOOK_PROVIDER_LABELS[provider]
}
