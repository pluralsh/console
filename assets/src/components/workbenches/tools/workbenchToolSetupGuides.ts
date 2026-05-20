import { WorkbenchToolType } from 'generated/graphql'

const TOOL_SETUP_GUIDE_MARKDOWN_PATHS: Partial<
  Record<WorkbenchToolType, string>
> = {
  [WorkbenchToolType.Http]: '/setup-guides/tools/http.md',
  [WorkbenchToolType.Elastic]: '/setup-guides/tools/elastic.md',
  [WorkbenchToolType.Prometheus]: '/setup-guides/tools/prometheus.md',
  [WorkbenchToolType.Loki]: '/setup-guides/tools/loki.md',
  [WorkbenchToolType.Tempo]: '/setup-guides/tools/tempo.md',
  [WorkbenchToolType.Jaeger]: '/setup-guides/tools/jaeger.md',
  [WorkbenchToolType.Datadog]: '/setup-guides/tools/datadog.md',
  [WorkbenchToolType.Linear]: '/setup-guides/tools/linear.md',
  [WorkbenchToolType.Slack]: '/setup-guides/tools/slack.md',
  [WorkbenchToolType.Atlassian]: '/setup-guides/tools/atlassian.md',
  [WorkbenchToolType.Exa]: '/setup-guides/tools/exa.md',
  [WorkbenchToolType.Github]: '/setup-guides/tools/github.md',
  [WorkbenchToolType.Gitlab]: '/setup-guides/tools/gitlab.md',
  [WorkbenchToolType.Bitbucket]: '/setup-guides/tools/bitbucket.md',
  [WorkbenchToolType.BitbucketDatacenter]:
    '/setup-guides/tools/bitbucket_datacenter.md',
  [WorkbenchToolType.AzureDevops]: '/setup-guides/tools/azure_devops.md',
  [WorkbenchToolType.Splunk]: '/setup-guides/tools/splunk.md',
  [WorkbenchToolType.Dynatrace]: '/setup-guides/tools/dynatrace.md',
  [WorkbenchToolType.Cloudwatch]: '/setup-guides/tools/cloudwatch.md',
  [WorkbenchToolType.Azure]: '/setup-guides/tools/azure.md',
  [WorkbenchToolType.Mcp]: '/setup-guides/tools/mcp.md',
}

const TOOL_SETUP_GUIDE_DOC_URLS: Partial<Record<WorkbenchToolType, string>> = {
  [WorkbenchToolType.Http]:
    'https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication',
  [WorkbenchToolType.Elastic]:
    'https://www.elastic.co/docs/reference/elasticsearch/security-privileges',
  [WorkbenchToolType.Prometheus]:
    'https://prometheus.io/docs/guides/basic-auth/',
  [WorkbenchToolType.Loki]:
    'https://grafana.com/docs/loki/latest/operations/authentication/',
  [WorkbenchToolType.Tempo]:
    'https://grafana.com/docs/tempo/latest/setup/operator/grafana_datasource/',
  [WorkbenchToolType.Jaeger]: 'https://www.jaegertracing.io/docs/latest/apis/',
  [WorkbenchToolType.Datadog]:
    'https://docs.datadoghq.com/account_management/api-app-keys/',
  [WorkbenchToolType.Linear]: 'https://linear.app/docs/api-and-webhooks',
  [WorkbenchToolType.Slack]: 'https://api.slack.com/authentication/oauth-v2',
  [WorkbenchToolType.Atlassian]:
    'https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/',
  [WorkbenchToolType.Exa]: 'https://dashboard.exa.ai/api-keys',
  [WorkbenchToolType.Github]:
    'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens',
  [WorkbenchToolType.Gitlab]:
    'https://docs.gitlab.com/user/profile/personal_access_tokens/',
  [WorkbenchToolType.Bitbucket]:
    'https://support.atlassian.com/bitbucket-cloud/docs/api-tokens/',
  [WorkbenchToolType.BitbucketDatacenter]:
    'https://confluence.atlassian.com/bitbucketserver/http-access-tokens-939515499.html',
  [WorkbenchToolType.AzureDevops]:
    'https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate',
  [WorkbenchToolType.Splunk]:
    'https://help.splunk.com/en/splunk-enterprise/administer/manage-users-and-security/latest/manage-splunk-platform-users-and-roles/define-roles-on-the-splunk-platform-with-capabilities',
  [WorkbenchToolType.Dynatrace]:
    'https://docs.dynatrace.com/docs/manage/identity-access-management/access-tokens-and-oauth-clients/access-tokens',
  [WorkbenchToolType.Cloudwatch]:
    'https://docs.aws.amazon.com/aws-managed-policy/latest/reference/CloudWatchReadOnlyAccess.html',
  [WorkbenchToolType.Azure]:
    'https://learn.microsoft.com/en-us/azure/azure-monitor/fundamentals/roles-permissions-security',
  [WorkbenchToolType.Mcp]: 'https://modelcontextprotocol.io/introduction',
}

export function getWorkbenchToolSetupGuideMarkdownPath(
  type: WorkbenchToolType
) {
  return TOOL_SETUP_GUIDE_MARKDOWN_PATHS[type]
}

export function getWorkbenchToolSetupGuideDocumentationUrl(
  type: WorkbenchToolType
) {
  return TOOL_SETUP_GUIDE_DOC_URLS[type]
}
