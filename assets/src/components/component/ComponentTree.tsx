import { EmptyState } from '@pluralsh/design-system'
import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'

import { ComponentTreeFragment, useComponentTreeQuery } from 'generated/graphql'

import { GqlError } from 'components/utils/Alert'

import { isNonNullable } from 'utils/isNonNullable'

import { ComponentTreeFlow } from 'components/cd/pipelines/ComponentTreeFlow'

import { ReactFlowProvider } from 'reactflow'

import { ComponentDetailsContext } from './ComponentDetails'
import {
  C_TYPES,
  HasMetadata,
  getTreeNodesAndEdges,
} from './tree/getTreeNodesAndEdges'

export default function ComponentTree() {
  const ctx = useOutletContext<ComponentDetailsContext>()
  const componentId = ctx?.component.id

  const queryRes = useComponentTreeQuery({ variables: { id: componentId } })
  const tree = queryRes.data?.componentTree

  console.log('queryRes', queryRes)

  const flowData = useMemo(() => {
    const metadatas = flattenMetadata(tree)

    return getTreeNodesAndEdges({
      edges: tree?.edges?.filter?.(isNonNullable) || [],
      metadatas: metadatas || [],
    })
  }, [tree])

  console.log('flow', flowData)

  if (queryRes.error) {
    return <GqlError error={queryRes.error} />
  }
  if (!queryRes.data?.componentTree) {
    return <EmptyState message="No data available." />
  }

  // return (
  //   <div>
  //     edges:
  //     {queryRes.data.componentTree.edges?.map((e) => (
  //       <div>
  //         {e?.from}--{e?.to}
  //       </div>
  //     ))}
  //   </div>
  // )

  return (
    <ReactFlowProvider>
      <ComponentTreeFlow
        nodes={flowData.nodes}
        edges={flowData.edges}
      />
    </ReactFlowProvider>
  )
}

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

export type TreeNodeMeta = ReturnType<typeof flattenMetadata>[number]
