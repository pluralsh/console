import { TRUNCATE } from 'components/utils/truncate'
import {
  WorkbenchToolConfiguration,
  WorkbenchToolHttpHeader,
  WorkbenchToolType,
  useWorkbenchToolQuery,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import styled from 'styled-components'

type MetadataRow = {
  label: string
  value?: string | null
}

type MetadataExtractor = (
  configuration: WorkbenchToolConfiguration | null
) => MetadataRow[]

const metadataExtractors: Record<WorkbenchToolType, MetadataExtractor> = {
  [WorkbenchToolType.Http]: extractHttpMetadata,
  [WorkbenchToolType.Datadog]: extractDatadogMetadata,
  [WorkbenchToolType.Elastic]: extractElasticMetadata,
  [WorkbenchToolType.Opensearch]: extractOpensearchMetadata,
  [WorkbenchToolType.Loki]: extractLokiMetadata,
  [WorkbenchToolType.Prometheus]: extractPrometheusMetadata,
  [WorkbenchToolType.Tempo]: extractTempoMetadata,
  [WorkbenchToolType.Atlassian]: extractAtlassianMetadata,
  [WorkbenchToolType.Linear]: extractLinearMetadata,
  [WorkbenchToolType.Slack]: extractSlackMetadata,
  [WorkbenchToolType.Pagerduty]: extractPagerdutyMetadata,
  [WorkbenchToolType.Teams]: extractTeamsMetadata,
  [WorkbenchToolType.Mcp]: () => [],
  [WorkbenchToolType.Sentry]: extractSentryMetadata,
  [WorkbenchToolType.Splunk]: extractSplunkMetadata,
  [WorkbenchToolType.Dynatrace]: extractDynatraceMetadata,
  [WorkbenchToolType.Cloudwatch]: extractCloudwatchMetadata,
  [WorkbenchToolType.Azure]: extractAzureMetadata,
  [WorkbenchToolType.Jaeger]: extractJaegerMetadata,
  [WorkbenchToolType.Exa]: extractExaMetadata,
  [WorkbenchToolType.Github]: extractGithubMetadata,
  [WorkbenchToolType.Gitlab]: extractGitlabMetadata,
  [WorkbenchToolType.Bitbucket]: extractBitbucketMetadata,
  [WorkbenchToolType.BitbucketDatacenter]: extractBitbucketDatacenterMetadata,
  [WorkbenchToolType.AzureDevops]: extractAzureDevopsMetadata,
  [WorkbenchToolType.Cloud]: () => [],
}

export function WorkbenchesConfiguredToolMetadata({
  toolId,
  toolType,
}: {
  toolId: string
  toolType: WorkbenchToolType
}) {
  const { data } = useWorkbenchToolQuery({
    variables: { id: toolId },
    fetchPolicy: 'cache-and-network',
  })

  const metadata =
    toolType === WorkbenchToolType.Mcp
      ? getMcpServerMetadataRows(data?.workbenchTool?.mcpServer)
      : getToolMetadataRows(
          toolType,
          data?.workbenchTool?.configuration ?? null
        )

  const visibleMetadata = metadata.filter(({ value }) => hasDisplayValue(value))

  if (isEmpty(visibleMetadata)) return null

  return (
    <ToolMetaSC>
      {visibleMetadata.map(({ label, value }) => (
        <ToolMetaRowSC key={label}>
          <ToolMetaLabelSC>{label}</ToolMetaLabelSC>
          <ToolMetaValueSC>{value}</ToolMetaValueSC>
        </ToolMetaRowSC>
      ))}
    </ToolMetaSC>
  )
}

function getMcpServerMetadataRows(
  mcpServer?: { name?: string | null; url?: string | null } | null
): MetadataRow[] {
  return [
    { label: 'Server', value: mcpServer?.name },
    { label: 'URL', value: mcpServer?.url },
  ]
}

function getToolMetadataRows(
  toolType: WorkbenchToolType,
  configuration: WorkbenchToolConfiguration | null
): MetadataRow[] {
  return metadataExtractors[toolType]?.(configuration) ?? []
}

function extractHttpMetadata(
  configuration: WorkbenchToolConfiguration | null
): MetadataRow[] {
  return [
    { label: 'Method', value: configuration?.http?.method },
    {
      label: 'Headers',
      value: String(getConfiguredHeadersCount(configuration?.http?.headers)),
    },
    { label: 'URL', value: configuration?.http?.url },
  ]
}

function extractDatadogMetadata(
  configuration: WorkbenchToolConfiguration | null
): MetadataRow[] {
  const site = configuration?.datadog?.site
  return [{ label: 'Site', value: site }]
}

function extractElasticMetadata(
  configuration: WorkbenchToolConfiguration | null
): MetadataRow[] {
  return [
    { label: 'URL', value: configuration?.elastic?.url },
    { label: 'Index', value: configuration?.elastic?.index },
    { label: 'User', value: configuration?.elastic?.username },
  ]
}

function extractOpensearchMetadata(
  configuration: WorkbenchToolConfiguration | null
): MetadataRow[] {
  const os = configuration?.opensearch
  return [
    { label: 'Host', value: os?.host },
    { label: 'Index', value: os?.index },
    { label: 'Region', value: os?.awsRegion },
    { label: 'Role', value: os?.assumeRoleArn },
    {
      label: 'Auth',
      value: os?.usePodIdentity ? 'Pod identity / IRSA' : 'Static AWS keys',
    },
  ]
}

function extractLokiMetadata(
  configuration: WorkbenchToolConfiguration | null
): MetadataRow[] {
  return [
    { label: 'URL', value: configuration?.loki?.url },
    { label: 'User', value: configuration?.loki?.username },
    { label: 'Tenant', value: configuration?.loki?.tenantId },
  ]
}

function extractPrometheusMetadata(
  configuration: WorkbenchToolConfiguration | null
): MetadataRow[] {
  return [
    { label: 'URL', value: configuration?.prometheus?.url },
    { label: 'User', value: configuration?.prometheus?.username },
    { label: 'Tenant', value: configuration?.prometheus?.tenantId },
  ]
}

function extractTempoMetadata(
  configuration: WorkbenchToolConfiguration | null
): MetadataRow[] {
  return [
    { label: 'URL', value: configuration?.tempo?.url },
    { label: 'User', value: configuration?.tempo?.username },
    { label: 'Tenant', value: configuration?.tempo?.tenantId },
  ]
}

function extractAtlassianMetadata(
  configuration: WorkbenchToolConfiguration | null
): MetadataRow[] {
  return [
    { label: 'URL', value: configuration?.atlassian?.url },
    { label: 'Email', value: configuration?.atlassian?.email },
  ]
}

function extractLinearMetadata(
  configuration: WorkbenchToolConfiguration | null
): MetadataRow[] {
  return [{ label: 'URL', value: configuration?.linear?.url }]
}

function extractSentryMetadata(
  configuration: WorkbenchToolConfiguration | null
): MetadataRow[] {
  return [{ label: 'URL', value: configuration?.sentry?.url }]
}

function extractSlackMetadata(
  configuration: WorkbenchToolConfiguration | null
): MetadataRow[] {
  return [{ label: 'URL', value: configuration?.slack?.url }]
}

function extractPagerdutyMetadata(
  configuration: WorkbenchToolConfiguration | null
): MetadataRow[] {
  return [{ label: 'URL', value: configuration?.pagerduty?.url }]
}

function extractTeamsMetadata(
  configuration: WorkbenchToolConfiguration | null
): MetadataRow[] {
  const t = configuration?.teams
  return [
    { label: 'Tenant ID', value: t?.tenantId },
    { label: 'Client ID', value: t?.clientId },
  ]
}

function extractSplunkMetadata(
  configuration: WorkbenchToolConfiguration | null
): MetadataRow[] {
  return [
    { label: 'URL', value: configuration?.splunk?.url },
    { label: 'User', value: configuration?.splunk?.username },
  ]
}

function extractDynatraceMetadata(
  configuration: WorkbenchToolConfiguration | null
): MetadataRow[] {
  return [{ label: 'URL', value: configuration?.dynatrace?.url }]
}

function extractCloudwatchMetadata(
  configuration: WorkbenchToolConfiguration | null
): MetadataRow[] {
  return [
    { label: 'Region', value: configuration?.cloudwatch?.region },
    {
      label: 'Groups',
      value: String(configuration?.cloudwatch?.logGroupNames?.length ?? 0),
    },
    { label: 'Role', value: configuration?.cloudwatch?.roleArn },
  ]
}

function extractAzureMetadata(
  configuration: WorkbenchToolConfiguration | null
): MetadataRow[] {
  return [
    { label: 'Tenant', value: configuration?.azure?.tenantId },
    { label: 'Client ID', value: configuration?.azure?.clientId },
    { label: 'Subscription ID', value: configuration?.azure?.subscriptionId },
  ]
}

function extractJaegerMetadata(
  configuration: WorkbenchToolConfiguration | null
): MetadataRow[] {
  return [
    { label: 'URL', value: configuration?.jaeger?.url },
    { label: 'User', value: configuration?.jaeger?.username },
  ]
}

function extractExaMetadata(
  configuration: WorkbenchToolConfiguration | null
): MetadataRow[] {
  return [{ label: 'URL', value: configuration?.exa?.url }]
}

function extractGithubMetadata(
  configuration: WorkbenchToolConfiguration | null
): MetadataRow[] {
  const gh = configuration?.github
  return [
    { label: 'URL', value: gh?.url },
    { label: 'Toolset', value: gh?.toolset },
    ...(gh?.appId
      ? [
          { label: 'GitHub App ID', value: gh.appId },
          { label: 'Installation ID', value: gh.installationId },
        ]
      : [{ label: 'Auth', value: 'Access token' }]),
  ]
}

function extractGitlabMetadata(
  configuration: WorkbenchToolConfiguration | null
): MetadataRow[] {
  return [{ label: 'URL', value: configuration?.gitlab?.url }]
}

function extractBitbucketMetadata(
  configuration: WorkbenchToolConfiguration | null
): MetadataRow[] {
  return [{ label: 'URL', value: configuration?.bitbucket?.url }]
}

function extractBitbucketDatacenterMetadata(
  configuration: WorkbenchToolConfiguration | null
): MetadataRow[] {
  return [{ label: 'URL', value: configuration?.bitbucketDatacenter?.url }]
}

function extractAzureDevopsMetadata(
  configuration: WorkbenchToolConfiguration | null
): MetadataRow[] {
  return [{ label: 'URL', value: configuration?.azureDevops?.url }]
}

function getConfiguredHeadersCount(
  headers?: (WorkbenchToolHttpHeader | null)[] | null
): number {
  if (!headers) return 0

  return headers.filter((header) => header?.name || header?.value).length
}

function hasDisplayValue(value?: string | null): value is string {
  return !!value?.trim()
}

const ToolMetaSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xxxsmall,
  marginLeft: 'auto',
  width: '100%',
}))

const ToolMetaRowSC = styled.div(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'auto 1fr',
  columnGap: theme.spacing.xsmall,
  alignItems: 'center',
}))

const ToolMetaLabelSC = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-xlight'],
  minWidth: 36,
}))

const ToolMetaValueSC = styled.span(({ theme }) => ({
  ...TRUNCATE,
  ...theme.partials.text.caption,
  color: theme.colors['text-light'],
  maxWidth: '100%',
}))
