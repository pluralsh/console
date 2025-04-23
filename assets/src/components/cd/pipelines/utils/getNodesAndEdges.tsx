import {
  GateState,
  GateType,
  PipelineFragment,
  PipelineGateFragment,
  PipelineStageEdgeFragment,
  PipelineStageFragment,
} from 'generated/graphql'
import { type Edge } from '@xyflow/react'
import isEmpty from 'lodash/isEmpty'
import { isNonNullable } from 'utils/isNonNullable'
import { groupBy } from 'lodash'

import { Entries } from 'type-fest'

import { StageStatus, getStageStatus } from '../nodes/StageNode'

import { EdgeType } from '../../../utils/reactflow/edges'

import { reduceGateStates } from './reduceGateStatuses'
import { DEMO_GATES, PIPELINE_DEBUG_MODE } from './_demo_data'

export enum NodeType {
  Stage = 'stage',
  Tests = 'tests',
  Approval = 'approval',
  Job = 'job',
}

const baseEdgeProps = {
  type: EdgeType.Pipeline,
  updatable: false,
}

const TYPE_SORT_VALS = Object.fromEntries(
  [NodeType.Stage, NodeType.Approval, NodeType.Job, NodeType.Tests].map(
    (val, i) => [val, i]
  )
)

function createNodeEdges(nodeId: string, toId: string, fromId: string) {
  const edges: Edge[] = []

  if (toId) {
    edges.push({
      ...baseEdgeProps,
      id: `${nodeId}->${toId}`,
      source: nodeId,
      target: toId,
    })
  }
  if (fromId) {
    edges.push({
      ...baseEdgeProps,
      id: `${fromId}->${nodeId}`,
      source: fromId,
      target: nodeId,
    })
  }

  return edges
}

export function getNodesAndEdges(pipeline: PipelineFragment) {
  const pipeStages = pipeline.stages?.filter(isNonNullable) ?? []
  const pipeEdges = pipeline.edges?.filter(isNonNullable) ?? []
  const { edges, nodes: gateNodes } = getGateNodes(pipeEdges)

  const stageNodes = getStageNodes(pipeStages)

  return {
    nodes: [...stageNodes, ...gateNodes],
    edges,
  }
}

function getGateNodes(pipeEdges: PipelineStageEdgeFragment[]) {
  const allEdges: Edge[] = []

  const nodes = pipeEdges?.flatMap((e) => {
    let edge = e

    if (PIPELINE_DEBUG_MODE) {
      // @ts-ignore
      edge = { ...edge, gates: DEMO_GATES }
    }
    if (edge && isEmpty(edge?.gates)) {
      allEdges.push({
        ...baseEdgeProps,
        id: edge.id,
        source: edge.from.id,
        target: edge.to.id,
        data: edge,
      })
    }

    const groupedGates = groupBy(edge?.gates, (gate) => {
      switch (gate?.type) {
        case GateType.Approval:
          return NodeType.Approval
        case GateType.Job:
          return NodeType.Job
        case GateType.Window:
        default:
          return NodeType.Tests
      }
    }) as Record<NodeType, PipelineGateFragment[]>

    return (
      (Object.entries(groupedGates) as Entries<typeof groupedGates>)
        // Order of edges matters to Dagre layout, so sort by type ahead of time
        .sort(
          ([aType], [bType]) => TYPE_SORT_VALS[bType] - TYPE_SORT_VALS[aType]
        )
        .flatMap(([type, gates]) => {
          // Don't add unsupported gate types
          if (type !== NodeType.Job && type !== NodeType.Approval) {
            return []
          }
          // Gate types that get their own node
          if (type === NodeType.Job) {
            const { edges, nodes } = getFlatGateNodesAndEdges(gates, edge, type)

            allEdges.push(...edges)

            return nodes
          }

          const { edges, node } = getGroupedGateNodeAndEdges(edge, type, gates)

          allEdges.push(...edges)

          return node || []
        })
    )
  })

  return { nodes, edges: allEdges }
}

function getGroupedGateNodeAndEdges(
  edge: PipelineStageEdgeFragment,
  type: NodeType,
  gates: PipelineGateFragment[]
) {
  const nodeId = `${edge.id}-${type}`

  if (!gates || !nodeId) {
    return { edges: [], node: undefined }
  }
  const state = reduceGateStates(gates)

  return {
    edges: createNodeEdges(nodeId, edge.to.id, edge.from.id),
    node: {
      id: nodeId,
      type,
      position: { x: 0, y: 0 },
      data: { ...edge, gates, meta: { state }, elkProperties: elkNodeProps },
    },
  }
}

function getFlatGateNodesAndEdges(
  gates: PipelineGateFragment[],
  edge: PipelineStageEdgeFragment,
  type: NodeType
) {
  const edges: Edge[] = []

  const nodes = gates?.flatMap((gate) => {
    const nodeId = gate.id

    if (!nodeId) {
      return []
    }
    edges.push(...createNodeEdges(nodeId, edge.to.id, edge.from.id))

    return {
      id: nodeId,
      type: type as NodeType,
      position: { x: 0, y: 0 },
      data: {
        ...edge,
        gates: [gate],
        meta: {
          state: (gate.state || undefined) as GateState | undefined,
        },
        elkProperties: elkNodeProps,
      },
    }
  })

  return { nodes, edges }
}

function getStageNodes(pipeStages: PipelineStageFragment[]) {
  return pipeStages.map((stage) => {
    const stageStatus = getStageStatus(stage)

    return {
      id: stage?.id,
      position: { x: 0, y: 0 },
      type: NodeType.Stage,
      data: {
        ...stage,
        meta: {
          stageStatus,
          state:
            stageStatus === StageStatus.Complete
              ? GateState.Open
              : GateState.Pending,
        },
        elkProperties: elkNodeProps,
      },
    }
  })
}

const elkNodeProps = {
  'elk.portAlignment.default': 'CENTER',
}
