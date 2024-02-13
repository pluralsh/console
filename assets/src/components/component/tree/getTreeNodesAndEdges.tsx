import { BASIC_EDGE_NAME } from 'components/cd/pipelines/EdgeLine'
import { ComponentTreeFragment, MetadataFragment } from 'generated/graphql'
import { ConditionalKeys } from 'type-fest'
import { isNonNullable } from 'utils/isNonNullable'

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
  type: BASIC_EDGE_NAME,
  updatable: false,
}

function flattenMetadata(
  tree: Nullable<ComponentTreeFragment>,
  rootKind: string
): {
  kind: string
  metadata?: MetadataFragment
  raw?: string
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
  tree: Nullable<ComponentTreeFragment>,
  rootKind: string
) {
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

  const nodes = flattenMetadata(tree, rootKind).map(({ kind, metadata }) => {
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
        kind,
        metadata,
      },
    }
  })

  return {
    nodes,
    edges,
  }
}
