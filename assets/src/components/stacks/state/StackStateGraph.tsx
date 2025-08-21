import { type Edge, type Node } from '@xyflow/react'
import { StackState } from 'generated/graphql'
import { useMemo, useState } from 'react'

import { isNonNullable } from '../../../utils/isNonNullable'
import { NodeType } from '../../cd/pipelines/utils/getNodesAndEdges'
import { EdgeType } from '../../utils/reactflow/edges'
import { ReactFlowGraph } from '../../utils/reactflow/ReactFlowGraph'

import {
  Card,
  EmptyState,
  Flex,
  Input,
  SearchIcon,
} from '@pluralsh/design-system'
import { LayoutOptions } from 'elkjs'
import Fuse from 'fuse.js'
import { isEmpty } from 'lodash'
import { useTheme } from 'styled-components'
import { useDebounce } from 'usehooks-ts'
import { StackStateGraphNode } from './StackStateGraphNode'

const nodeTypes = {
  [NodeType.Stage]: StackStateGraphNode,
}

const searchOptions = {
  keys: [{ name: 'all', getFn: (r) => JSON.stringify(r ?? {}) }],
  ignoreLocation: true,
  threshold: 0.25,
}

function getNodesAndEdges(state: StackState, query: string) {
  const resources = state.state?.filter(isNonNullable) ?? []

  const resourceIds = new Set(resources.map(({ identifier }) => identifier))

  // If the query is defined, identifiers of resources found by fuzzy search
  // plus resources linked directly to them (only these belonging to the state).
  // Identifiers of all resources from the state otherwise.
  const filteredIds = isEmpty(query)
    ? resourceIds
    : new Set(
        new Fuse(resources, searchOptions)
          .search(query)
          .map(({ item }) => [
            item.identifier,
            ...(item.links ?? []).filter(
              (link) => !!link && resourceIds.has(link)
            ),
          ])
          .flat()
      )

  const nodes: Node[] = []
  const edges: Edge[] = []
  resources
    .filter((r) => filteredIds.has(r.identifier))
    .forEach((r) => {
      nodes.push({
        id: r.identifier,
        position: { x: 0, y: 0 },
        type: NodeType.Stage,
        data: { ...r },
      })

      edges.push(
        ...(r.links ?? [])
          .filter((link): link is string => !!link && filteredIds.has(link))
          .map((link) => ({
            type: EdgeType.Bezier,
            updatable: false,
            id: `${r.identifier}${link}`,
            source: r.identifier,
            target: link,
          }))
      )
    })

  return { nodes, edges }
}

export function StackStateGraph({ state }: { state: StackState }) {
  const { colors } = useTheme()
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 250)

  const { nodes: baseNodes, edges: baseEdges } = useMemo(
    () => getNodesAndEdges(state, debouncedQuery),
    [state, debouncedQuery]
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
      {isEmpty(baseNodes) ? (
        <Card css={{ height: '100%', background: colors['fill-accent'] }}>
          <EmptyState message="No resources found, try a different search query." />
        </Card>
      ) : (
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
      )}
    </Flex>
  )
}

const options: LayoutOptions = {
  'elk.algorithm': 'layered',
  'elk.edgeRouting': 'POLYLINE',
}
