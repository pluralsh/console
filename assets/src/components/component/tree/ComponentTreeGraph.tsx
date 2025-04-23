import { useMemo } from 'react'

import { LayoutOptions } from 'elkjs'
import {
  ComponentTreeFragment,
  ServiceDeploymentComponentFragment,
} from 'generated/graphql'
import { ReactFlowGraph } from '../../utils/reactflow/ReactFlowGraph'
import { ComponentTreeNode } from './ComponentTreeNode'
import { getTreeNodesAndEdges } from './getTreeNodesAndEdges'

const nodeTypes = {
  component: ComponentTreeNode,
}

export function ComponentTreeGraph({
  tree,
  component,
}: {
  tree: ComponentTreeFragment
  component: ServiceDeploymentComponentFragment
}) {
  const { nodes: baseNodes, edges: baseEdges } = useMemo(
    () => getTreeNodesAndEdges(tree, component.kind.toLowerCase()),
    [component, tree]
  )

  return (
    <ReactFlowGraph
      baseNodes={baseNodes}
      baseEdges={baseEdges}
      elkOptions={options}
      nodeTypes={nodeTypes}
    />
  )
}

const options: LayoutOptions = {
  'elk.algorithm': 'layered',
}
