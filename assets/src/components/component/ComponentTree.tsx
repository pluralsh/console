import { EmptyState } from '@pluralsh/design-system'
import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { ReactFlowProvider } from 'reactflow'

import { useComponentTreeQuery } from 'generated/graphql'

import { GqlError } from 'components/utils/Alert'
import { ComponentTreeFlow } from 'components/component/tree/ComponentTreeFlow'

import { ComponentDetailsContext } from './ComponentDetails'
import { getTreeNodesAndEdges } from './tree/getTreeNodesAndEdges'

export default function ComponentTree() {
  const ctx = useOutletContext<ComponentDetailsContext>()
  const componentId = ctx?.component.id

  const queryRes = useComponentTreeQuery({ variables: { id: componentId } })
  const tree = queryRes.data?.componentTree

  console.log('queryRes', queryRes)

  const flowData = useMemo(() => getTreeNodesAndEdges(tree), [tree])

  console.log('flow', flowData)

  if (queryRes.error) {
    return <GqlError error={queryRes.error} />
  }
  if (!queryRes.data?.componentTree) {
    return <EmptyState message="No data available." />
  }

  return (
    <div css={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div>
        <div>Edges</div>
        {queryRes.data.componentTree.edges?.map((e) => (
          <div>
            Edge: {e?.from}--{e?.to}
          </div>
        ))}
      </div>

      <ReactFlowProvider>
        <ComponentTreeFlow
          nodes={flowData.nodes}
          edges={flowData.edges}
        />
      </ReactFlowProvider>
    </div>
  )
}
