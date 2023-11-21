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

import { StageStatus, getStageStatus } from '../nodes/StageNode'

import { CUSTOM_EDGE_NAME } from '../EdgeLine'

import { reduceGateStates } from './reduceGateStatuses'

import { DEMO_GATES, PIPELINE_DEBUG_MODE } from './_demo_data'

export enum NodeType {
  Stage = 'stage',
  Tests = 'tests',
  Approval = 'approval',
}

const baseEdgeProps = {
  type: CUSTOM_EDGE_NAME,
  updatable: false,
}

const TYPE_SORT_VALS = Object.fromEntries(
  [NodeType.Stage, NodeType.Approval, NodeType.Tests].map((val, i) => [val, i])
)

export function getNodesEdges(pipeline: PipelineFragment) {
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
        default:
          return NodeType.Tests
      }
    }) as Record<NodeType, PipelineGateFragment[]>

    return (
      Object.entries(groupedGates)
        // Order of edges matters to Dagre layout, so sort by type ahead of time
        .sort(
          ([aType], [bType]) => TYPE_SORT_VALS[bType] - TYPE_SORT_VALS[aType]
        )
        .flatMap(([type, gates]) => {
          const nodeId =
            type === NodeType.Approval
              ? `${edge.id}-${gates?.[0]?.id}`
              : edge.id

          if (!gates || !nodeId) {
            return []
          }

          if (edge?.to?.id) {
            edges.push({
              ...baseEdgeProps,
              id: `${nodeId}->${edge.to.id}`,
              source: nodeId,
              target: edge.to.id,
            })
          }
          if (edge?.from?.id) {
            edges.push({
              ...baseEdgeProps,
              id: `${edge.from.id}->${nodeId}`,
              source: edge.from.id,
              target: nodeId,
            })
          }
          const state = reduceGateStates(gates)

          return {
            id: nodeId,
            type,
            position: { x: 0, y: 0 },
            data: { ...edge, gates, meta: { state } },
          }
        })
    )
  })

  return {
    initialNodes: [
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
    initialEdges: edges,
  }
}
