import {
  GateState,
  GateType,
  PipelineFragment,
  PipelineGateFragment,
} from 'generated/graphql'
import { type Edge } from 'reactflow'
import isEmpty from 'lodash/isEmpty'
import { isNonNullable } from 'utils/isNonNullable'
import { groupBy } from 'lodash'

import { Entries } from 'type-fest'

import { StageStatus, getStageStatus } from '../nodes/StageNode'
import { PIPELINE_EDGE_NAME } from '../EdgeLine'

import { reduceGateStates } from './reduceGateStatuses'
import { DEMO_GATES, PIPELINE_DEBUG_MODE } from './_demo_data'

export enum NodeType {
  Stage = 'stage',
  Tests = 'tests',
  Approval = 'approval',
  Job = 'job',
}

const baseEdgeProps = {
  type: PIPELINE_EDGE_NAME,
  updatable: false,
}

const TYPE_SORT_VALS = Object.fromEntries(
  [NodeType.Stage, NodeType.Approval, NodeType.Job, NodeType.Tests].map(
    (val, i) => [val, i]
  )
)

function pushToEdges(
  edges: Edge<any>[],
  nodeId: string,
  toId: string,
  fromId: string
) {
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
}

export function getNodesAndEdges(pipeline: PipelineFragment) {
  const edges: Edge<any>[] = []
  const pipeStages = pipeline.stages?.filter(isNonNullable) ?? []
  const pipeEdges = pipeline.edges?.filter(isNonNullable) ?? []
  const gateNodes = pipeEdges?.flatMap((e) => {
    let edge = { ...e }

    if (PIPELINE_DEBUG_MODE) {
      // @ts-ignore
      edge = { ...edge, gates: DEMO_GATES }
    }
    if (edge && isEmpty(edge?.gates)) {
      edges.push({
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
            return gates?.flatMap((gate) => {
              const nodeId = gate.id

              if (!nodeId) {
                return []
              }
              pushToEdges(edges, nodeId, edge.to.id, edge.from.id)

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
                },
              }
            })
          }

          // Gate types that get are grouped into a single node
          const nodeId = `${edge.id}-${type}`

          if (!gates || !nodeId) {
            return []
          }
          pushToEdges(edges, nodeId, edge.to.id, edge.from.id)
          const state = reduceGateStates(gates)

          const y = {
            id: nodeId,
            type,
            position: { x: 0, y: 0 },
            data: { ...edge, gates, meta: { state } },
          }

          return y
        })
    )
  })

  return {
    nodes: [
      ...pipeStages.map((stage) => {
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
          },
        }
      }),
      ...gateNodes,
    ],
    edges,
  }
}
