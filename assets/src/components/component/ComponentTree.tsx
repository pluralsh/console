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

  console.log('componentz', component)

  const flowData = useMemo(() => {
    const flow = getTreeNodesAndEdges(tree)

    return {
      nodes: [
        {
          id: component.id,
          type: 'component',
          position: { x: 0, y: 0 },
          data: {
            kind: component.kind,
            metadata: {
              name: component.name,
              namespace: component.namespace,
              group: component.group,
            },
            raw: 'TODO: raw data',
          },
        },
        ...flow.nodes,
      ],
      edges: flow.edges,
    }
  }, [component, tree])

  if (queryRes.error) {
    return <GqlError error={queryRes.error} />
  }
  if (!queryRes.data?.componentTree) {
    return <EmptyState message="No data available." />
  }

  return (
    <div css={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* <div>
        <div>Edges</div>
        {queryRes.data.componentTree.edges?.map((e) => (
          <div>
            Edge: {e?.from}--{e?.to}
          </div>
        ))}

      </div> */}

      <ReactFlowProvider>
        <ComponentTreeGraph
          nodes={flowData.nodes}
          edges={flowData.edges}
        />
      </ReactFlowProvider>
    </div>
  )
}
