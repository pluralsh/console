import { type Edge, type Node } from '@xyflow/react'
import { StackState } from 'generated/graphql'
import { useMemo, useState } from 'react'

import { isNonNullable } from '../../../utils/isNonNullable'
import { NodeType } from '../../cd/pipelines/utils/getNodesAndEdges'
import { EdgeType } from '../../utils/reactflow/edges'
import { ReactFlowGraph } from '../../utils/reactflow/ReactFlowGraph'

import { LayoutOptions } from 'elkjs'
import { StackStateGraphNode } from './StackStateGraphNode'
import { Flex, Input, SearchIcon } from '@pluralsh/design-system'
import Fuse from 'fuse.js'

const nodeTypes = {
  [NodeType.Stage]: StackStateGraphNode,
}

const searchOptions = {
  keys: [
    'name',
    {
      name: 'configuration',
      getFn: (r) => JSON.stringify(r?.configuration ?? {}),
    },
  ],
  threshold: 0.25,
}

function getNodesAndEdges(state: StackState, query: string) {
  const nodes: Node[] = []
  const edges: Edge[] = []

  const resources = state.state?.filter(isNonNullable) ?? []

  const fuse = new Fuse(resources, searchOptions)
  const filteredResources =
    (query ? fuse.search(query).map(({ item }) => item) : resources) ?? []

  const filteredIds = new Set(filteredResources.map((ssr) => ssr?.identifier))

  filteredResources?.forEach((ssr) => {
    nodes.push({
      id: ssr.identifier,
      position: { x: 0, y: 0 },
      type: NodeType.Stage,
      data: { ...ssr },
    })

    edges.push(
      ...(ssr.links ?? [])
        .filter((link): link is string => !!link && filteredIds.has(link))
        .map((link) => ({
          type: EdgeType.Bezier,
          updatable: false,
          id: `${ssr.identifier}${link}`,
          source: ssr.identifier,
          target: link,
        }))
    )
  })

  return { nodes, edges }
}

export function StackStateGraph({ state }: { state: StackState }) {
  const [query, setQuery] = useState('')

  const { nodes: baseNodes, edges: baseEdges } = useMemo(
    () => getNodesAndEdges(state, query),
    [state, query]
  )

  return (
    <Flex
      direction="column"
      height="100%"
      gap="medium"
    >
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search resources"
        startIcon={<SearchIcon color="icon-light" />}
      />
      <div css={{ height: '100%' }}>
        <ReactFlowGraph
          allowFullscreen
          baseNodes={baseNodes}
          baseEdges={baseEdges}
          elkOptions={options}
          nodeTypes={nodeTypes}
          minZoom={0.05}
        />
      </div>
    </Flex>
  )
}

const options: LayoutOptions = {
  'elk.algorithm': 'layered',
  'elk.edgeRouting': 'POLYLINE',
}
