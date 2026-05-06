import {
  attrsToString,
  CHIP_ATTR_PREFIX,
  CHIP_DATA_ATTR,
  CHIP_TAG_ATTR,
} from 'components/utils/contentEditableChips'
import { MentionItem, MentionKind } from './mentionTypes'

const KIND_TO_TAG: Record<MentionKind, string> = {
  cluster: 'plrl-cluster',
  service: 'plrl-service',
  stack: 'plrl-stack',
  skill: 'plrl-skill',
}

export const PLRL_CHIP_TAG_NAMES = Object.values(KIND_TO_TAG)

function itemToAttrMap(
  item: MentionItem
): Record<string, string | null | undefined> {
  switch (item.kind) {
    case 'cluster':
      return {
        id: item.id,
        name: item.name,
        handle: item.handle,
        provider: item.provider?.cloud,
        distro: item.distro,
      }
    case 'service':
      return {
        id: item.id,
        name: item.name,
        namespace: item.namespace,
        'cluster-id': item.cluster?.id,
        'cluster-name': item.cluster?.name,
      }
    case 'stack':
      return {
        id: item.id,
        name: item.name,
        type: item.type,
      }
    case 'skill':
      return {
        id: item.id,
        name: item.name ?? undefined,
        description: item.description,
        subagents: item.subagents
          ?.filter((s): s is NonNullable<typeof s> => !!s)
          .join(','),
      }
  }
}

export function serializeMentionItem(item: MentionItem): string {
  const tag = KIND_TO_TAG[item.kind]
  const attrs = attrsToString(itemToAttrMap(item))
  return `<${tag}${attrs ? ' ' + attrs : ''}></${tag}>`
}

/**
 * Visible label for a chip in the editor — skill chips render with a leading
 * `/` so they read like the slash-trigger that produced them.
 */
export function chipDisplayLabel(item: MentionItem): string {
  const name = item.name ?? ''
  return item.kind === 'skill' ? `/${name}` : name
}

export function buildChipNode(item: MentionItem): HTMLElement {
  const span = document.createElement('span')
  span.setAttribute(CHIP_DATA_ATTR, 'true')
  span.setAttribute(CHIP_TAG_ATTR, KIND_TO_TAG[item.kind])
  span.setAttribute('contenteditable', 'false')
  for (const [k, v] of Object.entries(itemToAttrMap(item))) {
    if (v == null || v === '') continue
    span.setAttribute(`${CHIP_ATTR_PREFIX}${k}`, String(v))
  }
  span.textContent = chipDisplayLabel(item)
  return span
}
