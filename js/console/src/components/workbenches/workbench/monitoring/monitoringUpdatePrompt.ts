import { MentionKind } from 'components/ai/chatbot/input/autocomplete/mentionTypes'
import type { MonitoringResourceType } from 'components/ai/chatbot/input/autocomplete/mentionTypes'
import { serializeChipAttrs } from 'components/utils/contentEditableChips'

export function serializeMonitoringMention({
  id,
  name,
  resourceType,
  workbenchId,
}: {
  id: string
  name: string
  resourceType: MonitoringResourceType
  workbenchId: string
}): string {
  return serializeChipAttrs(MentionKind.Monitoring, {
    'item-id': id,
    'item-name': name,
    'resource-type': resourceType,
    'workbench-id': workbenchId,
  })
}

export function monitoringUpdatePromptSeed({
  id,
  name,
  resourceType,
  workbenchId,
}: {
  id: string
  name: string
  resourceType: MonitoringResourceType
  workbenchId: string
}): string {
  return `${serializeMonitoringMention({ id, name, resourceType, workbenchId })} `
}
