import { TRUNCATE } from 'components/utils/truncate'
import { WorkbenchToolType, useWorkbenchToolQuery } from 'generated/graphql'
import styled from 'styled-components'

type ToolConfig = {
  http?: { url?: string | null } | null
  datadog?: { site?: string | null } | null
  elastic?: { index: string; url: string; username: string } | null
  loki?: { url?: string | null; username?: string | null } | null
  prometheus?: { url?: string | null; username?: string | null } | null
  tempo?: { url?: string | null; username?: string | null } | null
  atlassian?: { email?: string | null; url: string } | null
  linear?: { url: string } | null
  splunk?: { url?: string | null; username?: string | null } | null
  cloudwatch?: {
    logGroupNames?: (string | null)[] | null
    region?: string | null
    roleArn?: string | null
  } | null
  dynatrace?: { url?: string | null } | null
}

type MetadataRow = {
  label: string
  value?: string | null
}

type MetadataExtractor = (configuration: ToolConfig | null) => MetadataRow[]

const metadataExtractors: Record<WorkbenchToolType, MetadataExtractor> = {
  [WorkbenchToolType.Http]: extractHttpMetadata,
  [WorkbenchToolType.Datadog]: extractDatadogMetadata,
  [WorkbenchToolType.Elastic]: extractElasticMetadata,
  [WorkbenchToolType.Loki]: extractLokiMetadata,
  [WorkbenchToolType.Prometheus]: extractPrometheusMetadata,
  [WorkbenchToolType.Tempo]: extractTempoMetadata,
  [WorkbenchToolType.Atlassian]: extractAtlassianMetadata,
  [WorkbenchToolType.Linear]: extractLinearMetadata,
  [WorkbenchToolType.Mcp]: extractNoConfigurationMetadata,
  [WorkbenchToolType.Sentry]: extractNoConfigurationMetadata,
  [WorkbenchToolType.Splunk]: extractSplunkMetadata,
  [WorkbenchToolType.Dynatrace]: extractDynatraceMetadata,
  [WorkbenchToolType.Cloudwatch]: extractCloudwatchMetadata,
}

export function ConfiguredToolMetadata({
  toolId,
  toolType,
}: {
  toolId: string
  toolType: WorkbenchToolType
}) {
  const { data } = useWorkbenchToolQuery({
    variables: { id: toolId },
  })

  const metadata = getToolMetadataRows(
    toolType,
    data?.workbenchTool?.configuration ?? null
  )

  if (metadata.length === 0) return null

  return (
    <ToolMetaSC>
      {metadata.map(({ label, value }) => (
        <ToolMetaRowSC key={label}>
          <ToolMetaLabelSC>{label}</ToolMetaLabelSC>
          <ToolMetaValueSC>{value ?? '-'}</ToolMetaValueSC>
        </ToolMetaRowSC>
      ))}
    </ToolMetaSC>
  )
}

function getToolMetadataRows(
  toolType: WorkbenchToolType,
  configuration: ToolConfig | null
): MetadataRow[] {
  return metadataExtractors[toolType]?.(configuration) ?? []
}

function extractHttpMetadata(configuration: ToolConfig | null): MetadataRow[] {
  return [
    { label: 'URL', value: configuration?.http?.url },
    { label: 'Host', value: getUrlHost(configuration?.http?.url) },
    { label: 'Protocol', value: getUrlProtocol(configuration?.http?.url) },
  ]
}

function extractDatadogMetadata(
  configuration: ToolConfig | null
): MetadataRow[] {
  const site = configuration?.datadog?.site
  return [
    { label: 'Site', value: site },
    { label: 'API', value: site ? `https://api.${site}` : null },
    { label: 'Logs', value: site ? `https://http-intake.logs.${site}` : null },
  ]
}

function extractElasticMetadata(
  configuration: ToolConfig | null
): MetadataRow[] {
  return [
    { label: 'URL', value: configuration?.elastic?.url },
    { label: 'Index', value: configuration?.elastic?.index },
    { label: 'User', value: configuration?.elastic?.username },
  ]
}

function extractLokiMetadata(configuration: ToolConfig | null): MetadataRow[] {
  return [
    { label: 'URL', value: configuration?.loki?.url },
    { label: 'User', value: configuration?.loki?.username },
    { label: 'Host', value: getUrlHost(configuration?.loki?.url) },
  ]
}

function extractPrometheusMetadata(
  configuration: ToolConfig | null
): MetadataRow[] {
  return [
    { label: 'URL', value: configuration?.prometheus?.url },
    { label: 'User', value: configuration?.prometheus?.username },
    { label: 'Host', value: getUrlHost(configuration?.prometheus?.url) },
  ]
}

function extractTempoMetadata(configuration: ToolConfig | null): MetadataRow[] {
  return [
    { label: 'URL', value: configuration?.tempo?.url },
    { label: 'User', value: configuration?.tempo?.username },
    { label: 'Host', value: getUrlHost(configuration?.tempo?.url) },
  ]
}

function extractAtlassianMetadata(
  configuration: ToolConfig | null
): MetadataRow[] {
  return [
    { label: 'URL', value: configuration?.atlassian?.url },
    { label: 'Email', value: configuration?.atlassian?.email },
    { label: 'Host', value: getUrlHost(configuration?.atlassian?.url) },
  ]
}

function extractLinearMetadata(
  configuration: ToolConfig | null
): MetadataRow[] {
  return [
    { label: 'URL', value: configuration?.linear?.url },
    { label: 'Host', value: getUrlHost(configuration?.linear?.url) },
    { label: 'Protocol', value: getUrlProtocol(configuration?.linear?.url) },
  ]
}

function extractNoConfigurationMetadata(): MetadataRow[] {
  return []
}

function extractSplunkMetadata(
  configuration: ToolConfig | null
): MetadataRow[] {
  return [
    { label: 'URL', value: configuration?.splunk?.url },
    { label: 'User', value: configuration?.splunk?.username },
    { label: 'Host', value: getUrlHost(configuration?.splunk?.url) },
  ]
}

function extractDynatraceMetadata(
  configuration: ToolConfig | null
): MetadataRow[] {
  return [
    { label: 'URL', value: configuration?.dynatrace?.url },
    { label: 'Host', value: getUrlHost(configuration?.dynatrace?.url) },
    { label: 'Protocol', value: getUrlProtocol(configuration?.dynatrace?.url) },
  ]
}

function extractCloudwatchMetadata(
  configuration: ToolConfig | null
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

function getUrlHost(url?: string | null): string | null {
  if (!url) return null
  try {
    return new URL(url).host
  } catch {
    return null
  }
}

function getUrlProtocol(url?: string | null): string | null {
  if (!url) return null
  try {
    return new URL(url).protocol.replace(':', '')
  } catch {
    return null
  }
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
