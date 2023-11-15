import { IconFrame, ReloadIcon } from '@pluralsh/design-system'
import { PipelineFragment } from 'generated/graphql'
import { useCallback, useMemo } from 'react'
import ReactFlow, {
  Background,
  BackgroundVariant,
  type Edge,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from 'reactflow'
import Dagre from '@dagrejs/dagre'

import 'reactflow/dist/style.css'
import { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'

import chroma from 'chroma-js'

import isEmpty from 'lodash/isEmpty'

import { GateNode, StageNode } from './PipelineNodes'

enum NodeType {
  Stage = 'stage',
  Gate = 'gate',
}
const nodeTypes = {
  [NodeType.Stage]: StageNode,
  [NodeType.Gate]: GateNode,
}

const dagre = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}))

const getLayoutedElements = (nodes, edges, options) => {
  dagre.setGraph({ rankdir: options.direction })

  edges.forEach((edge) => dagre.setEdge(edge.source, edge.target))
  nodes.forEach((node) => dagre.setNode(node.id, node))

  Dagre.layout(dagre)

  return {
    nodes: nodes.map((node) => {
      const { x, y } = dagre.node(node.id)

      return { ...node, position: { x, y } }
    }),
    edges,
  }
}

export function Pipeline({ pipeline }: { pipeline: PipelineFragment }) {
  const theme = useTheme()
  const gridGap = theme.spacing.large
  const margin = gridGap * 1
  const { initialNodes, initialEdges } = useMemo(() => {
    const edges: Edge<any>[] = []
    const pipeStages = pipeline.stages?.filter(isNonNullable) ?? []
    const pipeEdges = pipeline.edges?.filter(isNonNullable) ?? []
    const gateNodes = pipeEdges?.flatMap((edge, i) => {
      console.log('edge', edge)
      if (edge && isEmpty(edge?.gates)) {
        edges.push({
          id: edge.id,
          source: edge.from.id,
          target: edge.to.id,
          data: edge,
        })
      }

      return (
        edge?.gates?.filter(isNonNullable)?.map((gate, j) => {
          console.log('gate', gate)
          if (gate) {
            if (edge?.to?.id) {
              edges.push({
                id: `${gate.id}->${edge.to.id}`,
                source: gate.id,
                target: edge.to.id,
              })
            }
            if (edge?.from?.id) {
              edges.push({
                id: `${edge.from.id}->${gate.id}`,
                source: edge.from.id,
                target: gate.id,
              })
            }
          }

          return {
            id: gate?.id,
            type: NodeType.Gate,
            position: {
              x: margin + i * gridGap * 10,
              y: margin + j * gridGap * 10,
            },
            data: gate,
          }
        }) ?? []
      )
    })

    return {
      initialNodes: [
        ...pipeStages.map((stage, i) => ({
          id: stage?.id,
          position: { x: margin + i * gridGap * 10, y: margin },
          type: NodeType.Stage,
          data: stage,
        })),
        ...gateNodes,
      ],
      initialEdges: edges,
    }
  }, [gridGap, margin, pipeline.edges, pipeline.stages])
  const { fitView, setViewport } = useReactFlow()
  const [nodes, setNodes, _onNodesChange] = useNodesState(initialNodes as any)
  const [edges, setEdges, _onEdgesChange] = useEdgesState(initialEdges)
  const _onLayout = useCallback(
    (direction) => {
      const layouted = getLayoutedElements(nodes, edges, { direction })

      setNodes([...layouted.nodes])
      setEdges([...layouted.edges])

      window.requestAnimationFrame(() => {
        fitView()
      })
    },
    [nodes, edges, setNodes, setEdges, fitView]
  )

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        // onNodesChange={onNodesChange}
        // onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        draggable
        nodesDraggable={false}
        edgesUpdatable={false}
        edgesFocusable={false}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={gridGap}
          size={1}
          color={`${chroma(theme.colors['border-fill-three']).alpha(1)}`}
        />
      </ReactFlow>
      <div
        css={{
          position: 'absolute',
          top: theme.spacing.xsmall,
          right: theme.spacing.xsmall,
        }}
      >
        <IconFrame
          clickable
          type="floating"
          icon={<ReloadIcon />}
          tooltip="Reset view"
          onClick={() => setViewport({ x: 0, y: 0, zoom: 1 })}
        >
          Reset view
        </IconFrame>
      </div>
    </div>
  )
}
