import { MentionKind } from 'components/ai/chatbot/input/autocomplete/mentionTypes'
import { serializeChipAttrs } from 'components/utils/contentEditableChips'
import { ClusterScalingRecommendationFragment } from 'generated/graphql'
import ejs from 'ejs'
import { filesize } from 'filesize'
import scalingRecommendationWorkbenchPromptTemplate from './scaling-recommendation-workbench-prompt.ejs?raw'

const renderScalingRecommendationWorkbenchPrompt = ejs.compile(
  scalingRecommendationWorkbenchPromptTemplate
)

export type ScalingRecommendationCluster = {
  id: string
  name: string
  distro?: Nullable<string>
}

function formatCpu(cpu: Nullable<number>) {
  if (cpu == null) return '--'
  if (cpu > 1) return Number(cpu).toFixed(1)

  return `${Math.ceil((cpu * 1000) / 10) * 10}m`
}

function formatMemory(memory: Nullable<number>) {
  if (memory == null) return '--'

  return filesize(memory, {
    spacer: '',
    symbols: {
      KB: 'Ki',
      MB: 'Mi',
      GB: 'Gi',
      TB: 'Ti',
      PB: 'Pi',
    },
  })
}

function clusterMention(cluster: ScalingRecommendationCluster): string {
  return serializeChipAttrs(MentionKind.Cluster, {
    'item-id': cluster.id,
    'item-name': cluster.name,
    distro: cluster.distro,
  })
}

function serviceMention(
  rec: ClusterScalingRecommendationFragment
): string | null {
  const service = rec.service
  if (!service?.id) return null

  return serializeChipAttrs(MentionKind.Service, {
    'item-id': service.id,
    'item-name': service.name,
  })
}

export function buildScalingRecommendationWorkbenchPrompt(
  cluster: ScalingRecommendationCluster,
  rec: ClusterScalingRecommendationFragment
): string {
  return renderScalingRecommendationWorkbenchPrompt({
    cluster: clusterMention(cluster),
    service: serviceMention(rec),
    resource: {
      type: rec.type ?? 'Unknown',
      namespace: rec.namespace ?? 'Unknown',
      name: rec.name ?? 'Unknown',
      container: rec.container ?? 'Unknown',
    },
    recommendation: {
      cpuRequest: formatCpu(rec.cpuRequest),
      cpuRecommendation: formatCpu(rec.cpuRecommendation),
      memoryRequest: formatMemory(rec.memoryRequest),
      memoryRecommendation: formatMemory(rec.memoryRecommendation),
    },
  }).trim()
}
