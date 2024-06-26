import { IconFrame, ReloadIcon, usePrevious } from '@pluralsh/design-system'
import { GateState, StackState } from 'generated/graphql'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react'
import ReactFlow, {
  Background,
  BackgroundVariant,
  type Edge,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from 'reactflow'
import chroma from 'chroma-js'

import 'reactflow/dist/style.css'
import styled, { useTheme } from 'styled-components'

import { StageNode, StageStatus } from '../../cd/pipelines/nodes/StageNode'

import {
  type DagreDirection,
  getLayoutedElements,
} from '../../cd/pipelines/utils/nodeLayouter'

import { EdgeLineMarkerDefs, edgeTypes } from '../../cd/pipelines/EdgeLine'
import { NodeType } from '../../cd/pipelines/utils/getNodesAndEdges'
import { isNonNullable } from '../../../utils/isNonNullable'

const nodeTypes = {
  [NodeType.Stage]: StageNode,
}

export function getNodesAndEdges(state: StackState) {
  const stateResources =
    state?.state?.filter(isNonNullable).map((stage) => {
      const stageStatus = StageStatus.Complete // todo getStageStatus(stage)

      return {
        id: stage.identifier,
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
    }) ?? []

  return {
    nodes: [...stateResources /* ...gateNodes */],
    // edges,
    edges: [],
  }
}

// function getGateNodes(pipeEdges: PipelineStageEdgeFragment[]) {
//   const allEdges: Edge<any>[] = []
//
//   const nodes = pipeEdges?.flatMap((e) => {
//     let edge = e
//
//     if (PIPELINE_DEBUG_MODE) {
//       // @ts-ignore
//       edge = { ...edge, gates: DEMO_GATES }
//     }
//     if (edge && isEmpty(edge?.gates)) {
//       allEdges.push({
//         ...baseEdgeProps,
//         id: edge.id,
//         source: edge.from.id,
//         target: edge.to.id,
//         data: edge,
//       })
//     }

export function StackStateGraph({ state }: { state: StackState }) {
  const theme = useTheme()
  const margin = theme.spacing.large
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => getNodesAndEdges(state),
    [state]
  )
  const { setViewport, getViewport, viewportInitialized } = useReactFlow()
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes as any)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [needsLayout, setNeedsLayout] = useState(true)
  const prevState = usePrevious(state)
  const prevNodes = usePrevious(nodes)
  const prevEdges = usePrevious(edges)

  const layoutNodes = useCallback(
    (direction: DagreDirection = 'LR') => {
      const layouted = getLayoutedElements(nodes, edges, {
        direction,
        zoom: getViewport().zoom,
        gridGap: theme.spacing.large,
        margin,
      })

      setNodes([...layouted.nodes])
      setEdges([...layouted.edges])
      setNeedsLayout(false)
    },
    [nodes, edges, getViewport, margin, setNodes, setEdges]
  )

  useLayoutEffect(() => {
    if (viewportInitialized && needsLayout) {
      layoutNodes()
      requestAnimationFrame(() => {
        layoutNodes()
      })
    }
  }, [
    viewportInitialized,
    needsLayout,
    nodes,
    prevNodes,
    edges,
    prevEdges,
    layoutNodes,
  ])

  useEffect(() => {
    // Don't run for initial value of pipeline, only for changes
    if (prevState && prevState !== state) {
      const { nodes, edges } = getNodesAndEdges(state)

      setNodes(nodes)
      setEdges(edges)
      setNeedsLayout(true)
    }
  }, [state, prevState, setEdges, setNodes])

  return (
    <div
      css={{
        border: theme.borders.default,
        width: '100%',
        height: '100%',
        borderRadius: theme.borderRadiuses.large,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <ReactFlowWrapperSC>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          draggable
          nodesDraggable={false}
          edgesUpdatable={false}
          edgesFocusable={false}
          nodesConnectable={false}
          edgeTypes={edgeTypes}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={theme.spacing.large}
            size={1}
            color={`${chroma(theme.colors['border-fill-three']).alpha(1)}`}
          />
          <EdgeLineMarkerDefs />
        </ReactFlow>
        <div
          css={{
            position: 'absolute',
            top: theme.spacing.xsmall,
            right: theme.spacing.xsmall,
            display: 'flex',
            gap: theme.spacing.xsmall,
          }}
        >
          <IconFrame
            clickable
            type="floating"
            icon={<ReloadIcon />}
            tooltip="Reset view"
            onClick={() =>
              setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 500 })
            }
          >
            Reset view
          </IconFrame>
        </div>
      </ReactFlowWrapperSC>
    </div>
  )
}

const ReactFlowWrapperSC = styled.div<{ $hide?: boolean }>(({ $hide }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  '.react-flow__renderer': {
    opacity: $hide ? 0 : 1,
  },
  '.react-flow__edge': {
    pointerEvents: 'none',
    cursor: 'unset',
  },
}))
