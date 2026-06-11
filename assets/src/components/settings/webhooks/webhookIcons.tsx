import {
  AlertopsLogoIcon,
  AsanaLogoIcon,
  AzureDevopsLogoIcon,
  BitBucketIcon,
  DatadogLogoIcon,
  GitHubLogoIcon,
  GitLabLogoIcon,
  GrafanaLogoIcon,
  JiraLogoIcon,
  LinearLogoIcon,
  NewrelicLogoIcon,
  PagerdutyLogoIcon,
  SentryLogoIcon,
  WebhooksIcon,
} from '@pluralsh/design-system'
import {
  IssueWebhookProvider,
  ObservabilityWebhookType,
} from 'generated/graphql'

export function getObservabilityWebhookTypeIcon(type: Nullable<string>) {
  switch (type) {
    case ObservabilityWebhookType.Alertops:
      return <AlertopsLogoIcon fullColor />
    case ObservabilityWebhookType.Grafana:
      return <GrafanaLogoIcon fullColor />
    case ObservabilityWebhookType.Datadog:
      return <DatadogLogoIcon fullColor />
    case ObservabilityWebhookType.Newrelic:
      return <NewrelicLogoIcon fullColor />
    case ObservabilityWebhookType.Pagerduty:
      return <PagerdutyLogoIcon fullColor />
    case ObservabilityWebhookType.Sentry:
      return <SentryLogoIcon fullColor />
    case ObservabilityWebhookType.Plural:
    default:
      return <WebhooksIcon />
  }
}

export function getIssueWebhookProviderIcon(provider: Nullable<string>) {
  switch (provider) {
    case IssueWebhookProvider.AzureDevops:
      return <AzureDevopsLogoIcon fullColor />
    case IssueWebhookProvider.Bitbucket:
    case IssueWebhookProvider.BitbucketDatacenter:
      return <BitBucketIcon fullColor />
    case IssueWebhookProvider.Github:
      return <GitHubLogoIcon />
    case IssueWebhookProvider.Gitlab:
      return <GitLabLogoIcon fullColor />
    case IssueWebhookProvider.Linear:
      return <LinearLogoIcon fullColor />
    case IssueWebhookProvider.Jira:
      return <JiraLogoIcon fullColor />
    case IssueWebhookProvider.Asana:
      return <AsanaLogoIcon fullColor />
    default:
      return <WebhooksIcon />
  }
}
