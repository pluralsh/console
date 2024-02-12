import { ComponentTreeFragment, MetadataFragment } from 'generated/graphql'
import { ConditionalKeys } from 'type-fest'
import { isNonNullable } from 'utils/isNonNullable'

import { baseEdgeProps } from 'components/cd/pipelines/utils/getNodesAndEdges'

export type TreeNodeMeta = ReturnType<typeof flattenMetadata>[number]
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

const TYPE_SORT_VALS = Object.fromEntries(
  C_TYPES.map((val, i) => [val, i])
) as Record<ComponentKindsKey, number>

function flattenMetadata(tree: Nullable<ComponentTreeFragment>) {
  if (!tree) return []

  return C_TYPES.flatMap(
    (cType) =>
      tree?.[cType]?.filter(isNonNullable).map((c: HasMetadata) => ({
        kind: cType.slice(0, -1),
        ...c,
      })) || []
  )
}

export function getTreeNodesAndEdges(tree: Nullable<ComponentTreeFragment>) {
  const edges =
    tree?.edges?.flatMap((edge) => {
      if (!edge) return []

      return {
        ...baseEdgeProps,
        id: `${edge.from}->${edge.to}`,
        source: edge.from,
        target: edge.to,
      }
    }) || []

  const nodes = flattenMetadata(tree)
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
