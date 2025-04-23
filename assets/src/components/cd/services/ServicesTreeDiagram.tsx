import { type Edge, type Node } from '@xyflow/react'
import {
  GlobalServiceFragment,
  ServiceDeployment,
  ServiceTreeNodeFragment,
} from 'generated/graphql'
import { useMemo } from 'react'

import { chunk } from 'lodash'

import { LayoutOptions } from 'elkjs'
import { pairwise } from '../../../utils/array'
import { EdgeType } from '../../utils/reactflow/edges'
import { ReactFlowGraph } from '../../utils/reactflow/graph'
import {
  GlobalServiceNodeKey,
  ServiceNodeKey,
  nodeTypes,
} from './ServicesTreeDiagramNodes'

const isNotDeploymentOperatorService = (
  service: Pick<ServiceDeployment, 'name'>
) => service.name !== 'deploy-operator'

function getNodesAndEdges(
  services: ServiceTreeNodeFragment[],
  globalServices: GlobalServiceFragment[]
) {
  const nodes: Node[] = []
  const edges: Edge[] = []

  services.filter(isNotDeploymentOperatorService).forEach((service) => {
    nodes.push({
      id: service.id,
      position: { x: 0, y: 0 },
      type: ServiceNodeKey,
      data: { ...service },
    })

    if (service.parent?.id && isNotDeploymentOperatorService(service.parent)) {
      edges.push({
        type: EdgeType.Smooth,
        reconnectable: false,
        id: `${service.id}${service.parent.id}`,
        source: service.parent.id,
        target: service.id,
      })
    }

    if (service.owner?.id) {
      edges.push({
        type: EdgeType.Smooth,
        reconnectable: false,
        id: `${service.id}${service.owner.id}`,
        source: service.owner.id,
        target: service.id,
      })
    }
  })

  globalServices.forEach((service) => {
    nodes.push({
      id: service.id,
      position: { x: 0, y: 0 },
      type: GlobalServiceNodeKey,
      data: { ...service },
    })

    if (service.parent?.id && isNotDeploymentOperatorService(service.parent)) {
      edges.push({
        type: EdgeType.Smooth,
        reconnectable: false,
        id: `${service.id}${service.parent.id}`,
        source: service.parent.id,
        target: service.id,
      })
    }
  })

  positionOrphanedNodes(nodes, edges)

  return { nodes, edges }
}

function positionOrphanedNodes(nodes: Node[], edges: Edge[]) {
  const connectedNodes = new Set<string>()

  edges.forEach((edge) => {
    connectedNodes.add(edge.source)
    connectedNodes.add(edge.target)
  })

  const orphanedNodes = nodes.filter((node) => !connectedNodes.has(node.id))

  chunk(orphanedNodes, 3).forEach((chunk) => {
    for (const [source, target] of pairwise(chunk)) {
      edges.push({
        type: EdgeType.Invisible,
        reconnectable: false,
        id: `positioning${source.id}${target.id}`,
        source: source.id,
        target: target.id,
      })
    }
  })
}

export function ServicesTreeDiagram({
  services,
  globalServices,
}: {
  services: ServiceTreeNodeFragment[]
  globalServices: GlobalServiceFragment[]
}) {
  const { nodes: baseNodes, edges: baseEdges } = useMemo(
    () => getNodesAndEdges(services, globalServices),
    [globalServices, services]
  )

  return (
    <ReactFlowGraph
      allowFullscreen
      baseNodes={baseNodes}
      baseEdges={baseEdges}
      elkOptions={options}
      minZoom={0.01}
      nodeTypes={nodeTypes}
    />
  )
}

const options: LayoutOptions = {
  'elk.algorithm': 'layered',
}
