import {
  DatadogLogoIcon,
  GitHubLogoIcon,
  GitLabLogoIcon,
  GrafanaLogoIcon,
  NewrelicLogoIcon,
  PagerdutyLogoIcon,
  SentryLogoIcon,
  TicketIcon,
  VisualInspectionIcon,
  WebhooksIcon,
} from '@pluralsh/design-system'

import {
  IssueWebhookProvider,
  ObservabilityWebhookType,
  WorkbenchWebhookFragment,
} from 'generated/graphql'

export function webhookURL(webhook: WorkbenchWebhookFragment) {
  if (webhook.issueWebhook) return webhook.issueWebhook.url

  if (webhook.webhook) return webhook.webhook.url

  return undefined
}

export function webhookTypeIcon(webhook: WorkbenchWebhookFragment) {
  if (webhook.issueWebhook) return <TicketIcon />

  return <VisualInspectionIcon />
}

export function webhookTypeLabel(webhook: WorkbenchWebhookFragment) {
  if (webhook.issueWebhook) return 'Ticketing'

  return 'Observability'
}

export function getObservabilityWebhookTypeIcon(type: Nullable<string>) {
  switch (type) {
    case ObservabilityWebhookType.Grafana:
      return <GrafanaLogoIcon fullColor />
    case ObservabilityWebhookType.Datadog:
      return <DatadogLogoIcon fullColor />
    case ObservabilityWebhookType.Newrelic:
      return <NewrelicLogoIcon fullColor />
    case ObservabilityWebhookType.Pagerduty:
      return <PagerdutyLogoIcon fullColor />
    case ObservabilityWebhookType.Sentry:
      return <SentryLogoIcon />
    case ObservabilityWebhookType.Plural:
    default:
      return <WebhooksIcon />
  }
}

export function getIssueWebhookProviderIcon(provider: Nullable<string>) {
  switch (provider) {
    case IssueWebhookProvider.Github:
      return <GitHubLogoIcon />
    case IssueWebhookProvider.Gitlab:
      return <GitLabLogoIcon />
    case IssueWebhookProvider.Jira:
    case IssueWebhookProvider.Linear:
    case IssueWebhookProvider.Asana:
    default:
      return <WebhooksIcon />
  }
}

export function getWebhookIcon(webhook: WorkbenchWebhookFragment) {
  if (webhook.issueWebhook) {
    return getIssueWebhookProviderIcon(webhook.issueWebhook.provider)
  }
  return getObservabilityWebhookTypeIcon(webhook.webhook?.type)
}
