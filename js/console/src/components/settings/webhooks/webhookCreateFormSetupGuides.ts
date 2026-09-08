import {
  IssueWebhookProvider,
  ObservabilityWebhookType,
} from 'generated/graphql'

import { SetupGuideSelection } from './WebhookCreateFormTypes'

const OBSERVABILITY_SETUP_GUIDE_PATHS: Record<
  ObservabilityWebhookType,
  string
> = {
  [ObservabilityWebhookType.Alertops]: '/setup-guides/webhooks/alertops.md',
  [ObservabilityWebhookType.Datadog]: '/setup-guides/webhooks/datadog.md',
  [ObservabilityWebhookType.Grafana]: '/setup-guides/webhooks/grafana.md',
  [ObservabilityWebhookType.Newrelic]: '/setup-guides/webhooks/newrelic.md',
  [ObservabilityWebhookType.Pagerduty]: '/setup-guides/webhooks/pagerduty.md',
  [ObservabilityWebhookType.Plural]: '/setup-guides/webhooks/plural.md',
  [ObservabilityWebhookType.Sentry]: '/setup-guides/webhooks/sentry.md',
}

const ISSUE_SETUP_GUIDE_PATHS: Record<IssueWebhookProvider, string> = {
  [IssueWebhookProvider.Asana]: '/setup-guides/webhooks/asana.md',
  [IssueWebhookProvider.AzureDevops]: '/setup-guides/webhooks/azure_devops.md',
  [IssueWebhookProvider.Bitbucket]: '/setup-guides/webhooks/bitbucket.md',
  [IssueWebhookProvider.BitbucketDatacenter]:
    '/setup-guides/webhooks/bitbucket_datacenter.md',
  [IssueWebhookProvider.Github]: '/setup-guides/webhooks/github.md',
  [IssueWebhookProvider.Gitlab]: '/setup-guides/webhooks/gitlab.md',
  [IssueWebhookProvider.Jira]: '/setup-guides/webhooks/jira.md',
  [IssueWebhookProvider.Linear]: '/setup-guides/webhooks/linear.md',
}

const OBSERVABILITY_SETUP_GUIDE_DOCUMENTATION_URLS: Partial<
  Record<ObservabilityWebhookType, string>
> = {
  [ObservabilityWebhookType.Datadog]:
    'https://docs.plural.sh/plural-features/observability/observability-webhooks/datadog',
  [ObservabilityWebhookType.Grafana]:
    'https://docs.plural.sh/plural-features/observability/observability-webhooks/grafana',
}

const ISSUE_SETUP_GUIDE_DOCUMENTATION_URLS: Partial<
  Record<IssueWebhookProvider, string>
> = {
  [IssueWebhookProvider.AzureDevops]:
    'https://learn.microsoft.com/en-us/azure/devops/service-hooks/services/webhooks?view=azure-devops',
  [IssueWebhookProvider.Bitbucket]:
    'https://support.atlassian.com/bitbucket-cloud/docs/manage-webhooks',
  [IssueWebhookProvider.BitbucketDatacenter]:
    'https://confluence.atlassian.com/display/BitbucketServer/Manage+webhooks',
}

export function getSetupGuideMarkdownPath({
  webhookType,
  observabilityType,
  issueProvider,
}: SetupGuideSelection): Nullable<string> {
  if (webhookType === 'observability') {
    if (!observabilityType) return null

    return OBSERVABILITY_SETUP_GUIDE_PATHS[observabilityType] ?? null
  }

  if (!issueProvider) return null

  return ISSUE_SETUP_GUIDE_PATHS[issueProvider] ?? null
}

export function getSetupGuideDocumentationUrl({
  webhookType,
  observabilityType,
  issueProvider,
}: SetupGuideSelection): string | undefined {
  if (webhookType === 'observability' && observabilityType) {
    return OBSERVABILITY_SETUP_GUIDE_DOCUMENTATION_URLS[observabilityType]
  }

  if (webhookType === 'issue' && issueProvider) {
    return ISSUE_SETUP_GUIDE_DOCUMENTATION_URLS[issueProvider]
  }

  return undefined
}
