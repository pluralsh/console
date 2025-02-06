import { ComponentTreeFragment, MetadataFragment } from 'generated/graphql'
import { ConditionalKeys } from 'type-fest'
import { isNonNullable } from 'utils/isNonNullable'

import { EdgeType } from '../../utils/reactflow/edges'

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

export const baseEdgeProps = {
  type: EdgeType.Directed,
  updatable: false,
}

function flattenMetadata(
  tree: Nullable<ComponentTreeFragment>,
  rootKind: string
): {
  kind: string
  metadata?: MetadataFragment
  raw?: string | object
}[] {
  if (!tree) return []

  return [
    { kind: rootKind, ...tree?.root },
    ...C_TYPES.flatMap(
      (cType) =>
        tree?.[cType]?.filter(isNonNullable).map((c: HasMetadata) => ({
          kind: cType.slice(0, -1),
          ...c,
        })) || []
    ),
  ]
}

export function getTreeNodesAndEdges(
  tree: ComponentTreeFragment,
  rootKind: string
) {
  const edges =
    tree.edges?.flatMap((edge) => {
      if (!edge) return []

      return {
        ...baseEdgeProps,
        id: `${edge.from}->${edge.to}`,
        source: edge.from,
        target: edge.to,
      }
    }) ?? []

  const nodes = flattenMetadata(tree, rootKind)
    .map(({ kind, metadata, raw }) => {
      // Gate types that get their own node
      const nodeId = metadata?.uid

      if (!nodeId) return null

      return {
        id: nodeId,
        type: 'component',
        position: { x: 0, y: 0 },
        data: {
          kind,
          metadata,
          raw,
        },
      }
    })
    .filter(isNonNullable)

  return {
    nodes,
    edges,
  }
}
