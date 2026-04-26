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
  [WorkbenchToolType.Atlassian]: '/setup-guides/tools/atlassian.md',
  [WorkbenchToolType.Splunk]: '/setup-guides/tools/splunk.md',
  [WorkbenchToolType.Dynatrace]: '/setup-guides/tools/dynatrace.md',
  [WorkbenchToolType.Cloudwatch]: '/setup-guides/tools/cloudwatch.md',
  [WorkbenchToolType.Azure]: '/setup-guides/tools/azure.md',
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
  [WorkbenchToolType.Atlassian]:
    'https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/',
  [WorkbenchToolType.Splunk]:
    'https://help.splunk.com/en/splunk-enterprise/administer/manage-users-and-security/latest/manage-splunk-platform-users-and-roles/define-roles-on-the-splunk-platform-with-capabilities',
  [WorkbenchToolType.Dynatrace]:
    'https://docs.dynatrace.com/docs/manage/identity-access-management/access-tokens-and-oauth-clients/access-tokens',
  [WorkbenchToolType.Cloudwatch]:
    'https://docs.aws.amazon.com/aws-managed-policy/latest/reference/CloudWatchReadOnlyAccess.html',
  [WorkbenchToolType.Azure]:
    'https://learn.microsoft.com/en-us/azure/azure-monitor/fundamentals/roles-permissions-security',
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
