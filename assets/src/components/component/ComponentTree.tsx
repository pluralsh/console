import { EmptyState } from '@pluralsh/design-system'
import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { ReactFlowProvider } from 'reactflow'

import { useComponentTreeQuery } from 'generated/graphql'

import { GqlError } from 'components/utils/Alert'
import { ComponentTreeGraph } from 'components/component/tree/ComponentTreeGraph'

import { ComponentDetailsContext } from './ComponentDetails'
import { getTreeNodesAndEdges } from './tree/getTreeNodesAndEdges'

export default function ComponentTree() {
  const ctx = useOutletContext<ComponentDetailsContext>()
  const component = ctx?.component
  const componentId = ctx?.component.id

  const queryRes = useComponentTreeQuery({ variables: { id: componentId } })
  const tree = queryRes.data?.componentTree

  const flowData = useMemo(
    () => getTreeNodesAndEdges(tree, component.kind.toLowerCase()),
    [component, tree]
  )

  if (queryRes.error) {
    return <GqlError error={queryRes.error} />
  }
  if (!queryRes.data?.componentTree) {
    return <EmptyState message="No data available." />
  }

  return (
    <div css={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <ReactFlowProvider>
        <ComponentTreeGraph {...flowData} />
      </ReactFlowProvider>
    </div>
  )
}
