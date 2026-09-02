import { MentionKind } from 'components/ai/chatbot/input/autocomplete/mentionTypes'
import { serializeChipAttrs } from 'components/utils/contentEditableChips'
import ejs from 'ejs'
import { AiInsightFragment } from 'generated/graphql'
import insightWorkbenchPromptTemplate from './insight-workbench-prompt.ejs?raw'

const insightHeadingPattern = /^(#{1,6})\s+(.+?)\s*$/gm
const includedSections = new Set(['summary', 'root cause'])
const renderInsightWorkbenchPrompt = ejs.compile(insightWorkbenchPromptTemplate)

type KubernetesIdentityResource = {
  id: string
  group?: Nullable<string>
  version?: Nullable<string>
  kind?: Nullable<string>
  name?: Nullable<string>
  namespace?: Nullable<string>
}

export function extractSummaryAndRootCause(
  insightText?: Nullable<string>
): string {
  if (!insightText) return ''

  const headings = [...insightText.matchAll(insightHeadingPattern)]

  return headings
    .filter((heading) => includedSections.has(heading[2].toLowerCase()))
    .map((heading) => {
      const nextHeading = headings.find(
        (next) => (next.index ?? 0) > (heading.index ?? 0)
      )
      const end = nextHeading?.index ?? insightText.length

      return insightText.slice(heading.index, end).trim()
    })
    .join('\n\n')
}

export function parentMentionFromInsight(
  insight: Nullable<AiInsightFragment>
): string | null {
  if (!insight) return null

  if (insight.stack?.id) {
    return serializeChipAttrs(MentionKind.Stack, {
      'item-id': insight.stack.id,
      'item-name': insight.stack.name,
      type: insight.stack.type,
    })
  }

  if (insight.stackRun?.stack?.id) {
    return serializeChipAttrs(MentionKind.Stack, {
      'item-id': insight.stackRun.stack.id,
      'item-name': insight.stackRun.stack.name,
    })
  }

  const service = insight.service ?? insight.serviceComponent?.service
  if (service?.id) {
    return serializeChipAttrs(MentionKind.Service, {
      'item-id': service.id,
      'item-name': service.name,
      'cluster-id': service.cluster?.id,
      'cluster-name': service.cluster?.name,
      'cluster-handle': service.cluster?.handle,
    })
  }

  const cluster = insight.cluster ?? insight.clusterInsightComponent?.cluster
  if (cluster?.id) {
    return serializeChipAttrs(MentionKind.Cluster, {
      'item-id': cluster.id,
      'item-name': cluster.name,
      distro: cluster.distro,
      provider: cluster.provider?.cloud,
    })
  }

  return null
}

function kubernetesResourceContext(
  resource: KubernetesIdentityResource,
  resourceLabel: string,
  parentLabel: string
): string {
  const apiVersion = resource.version
    ? resource.group
      ? `${resource.group}/${resource.version}`
      : resource.version
    : 'unknown'
  const scope = resource.namespace
    ? `namespace ${resource.namespace}`
    : 'cluster-scoped'

  return `Focus the investigation on the ${resourceLabel} with apiVersion ${apiVersion}, kind ${resource.kind ?? 'unknown'}, ${scope}, and name ${resource.name ?? 'unknown'} (id: ${resource.id}) within this ${parentLabel}.`
}

function serviceComponentContextFromInsight(
  insight: Nullable<AiInsightFragment>
): string | null {
  const component = insight?.serviceComponent
  if (!component?.id) return null

  return kubernetesResourceContext(component, 'service component', 'service')
}

function clusterInsightComponentContextFromInsight(
  insight: Nullable<AiInsightFragment>
): string | null {
  const component = insight?.clusterInsightComponent
  if (!component?.id) return null

  return kubernetesResourceContext(
    component,
    'cluster insight component',
    'cluster'
  )
}

export function buildInsightWorkbenchPrompt(
  insight: Nullable<AiInsightFragment>
): string {
  const mention = parentMentionFromInsight(insight)
  const subject = mention ?? 'this resource'
  const componentContext =
    serviceComponentContextFromInsight(insight) ??
    clusterInsightComponentContextFromInsight(insight)

  return renderInsightWorkbenchPrompt({
    subject,
    componentContext,
    insightText: extractSummaryAndRootCause(insight?.text),
  }).trim()
}
