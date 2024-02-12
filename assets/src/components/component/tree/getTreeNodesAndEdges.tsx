import { ComponentTreeFragment, MetadataFragment } from 'generated/graphql'
import { ConditionalKeys } from 'type-fest'

import { TreeNodeMeta } from '../ComponentTree'

export type HasMetadata = { metadata?: MetadataFragment }
export type ComponentKindsKey = ConditionalKeys<
  ComponentTreeFragment,
  Nullable<Nullable<HasMetadata>[]>
>

export const C_TYPES = [
  'certificates',
  'configmaps',
  'cronjobs',
  'daemonsets',
  'deployments',
  'ingresses',
  'secrets',
  'services',
  'statefulsets',
] as const satisfies ComponentKindsKey[]

// import { baseEdgeProps } from 'components/cd/pipelines/utils/getNodesAndEdges'
const baseEdgeProps = {
  type: 'plural-edge',
  updatable: false,
}
const TYPE_SORT_VALS = Object.fromEntries(
  C_TYPES.map((val, i) => [val, i])
) as Record<ComponentKindsKey, number>

export function getTreeNodesAndEdges({
  edges: edgesProp,
  metadatas,
}: {
  edges: { from: string; to: string }[]
  metadatas: TreeNodeMeta[]
}) {
  const edges = edgesProp.flatMap((edge) => {
    if (!edge) return []

    return {
      ...baseEdgeProps,
      id: `${edge.from}->${edge.to}`,
      source: edge.from,
      target: edge.to,
    }
  })

  const nodes = metadatas
    // Order of edges matters to Dagre layout, so sort by type ahead of time
    .sort((a, b) => TYPE_SORT_VALS[b.kind] - TYPE_SORT_VALS[a.kind])
    .map(({ kind, metadata }) => {
      // Gate types that get their own node
      const nodeId = metadata?.uid

      if (!nodeId) {
        return []
      }

      return {
        id: nodeId,
        type: 'component',
        position: { x: 0, y: 0 },
        data: {
          type: kind,
          meta: metadata,
        },
      }
    })

  return {
    nodes,
    edges,
  }
}
