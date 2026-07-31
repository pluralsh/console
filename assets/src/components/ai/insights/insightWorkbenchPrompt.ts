import { MentionKind } from 'components/ai/chatbot/input/autocomplete/mentionTypes'
import { encodeChipAttrValue } from 'components/utils/contentEditableChips'
import { AiInsightFragment } from 'generated/graphql'

function xmlAttr(name: string, value: Nullable<string | undefined>): string {
  if (value == null || value === '') return ''
  return `${name}="${encodeChipAttrValue(value)}"`
}

function serializeMention(
  kind: MentionKind,
  attrs: Array<string | false | null | undefined>
): string {
  const serialized = attrs.filter(Boolean)
  return `<${kind}${serialized.length ? ` ${serialized.join(' ')}` : ''}></${kind}>`
}

export function parentMentionFromInsight(
  insight: Nullable<AiInsightFragment>
): string | null {
  if (!insight) return null

  if (insight.stack?.id) {
    return serializeMention(MentionKind.Stack, [
      xmlAttr('item-id', insight.stack.id),
      xmlAttr('item-name', insight.stack.name),
      xmlAttr('type', insight.stack.type ?? undefined),
    ])
  }

  if (insight.stackRun?.stack?.id) {
    return serializeMention(MentionKind.Stack, [
      xmlAttr('item-id', insight.stackRun.stack.id),
      xmlAttr('item-name', insight.stackRun.stack.name),
    ])
  }

  const service = insight.service ?? insight.serviceComponent?.service
  if (service?.id) {
    return serializeMention(MentionKind.Service, [
      xmlAttr('item-id', service.id),
      xmlAttr('item-name', service.name),
      xmlAttr('cluster-id', service.cluster?.id),
      xmlAttr('cluster-name', service.cluster?.name),
      xmlAttr('cluster-handle', service.cluster?.handle),
    ])
  }

  if (insight.cluster?.id) {
    return serializeMention(MentionKind.Cluster, [
      xmlAttr('item-id', insight.cluster.id),
      xmlAttr('item-name', insight.cluster.name),
      xmlAttr('distro', insight.cluster.distro ?? undefined),
      xmlAttr('provider', insight.cluster.provider?.cloud ?? undefined),
    ])
  }

  return null
}

export function buildInsightWorkbenchPrompt(
  insight: Nullable<AiInsightFragment>
): string {
  const mention = parentMentionFromInsight(insight)
  const subject = mention ?? 'this resource'
  const componentName = insight?.clusterInsightComponent?.name
  const investigateTarget = insight?.stackRun
    ? `Investigate this stack run end to end.`
    : componentName
      ? `Investigate ${componentName} end to end.`
      : `Investigate with full context and determine the root cause.`

  return `The one-shot insight on ${subject} may be wrong or incomplete. ${investigateTarget}

Gather the full context needed to validate or correct the insight, then take the appropriate fix if you can confirm the issue.

Post the conclusion back on the insight.`
}
