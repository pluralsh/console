import { NodeProps } from 'reactflow'

import { useTheme } from 'styled-components'

import { ServiceDeploymentsRowFragment } from '../../../generated/graphql'
import { NodeBase } from '../../utils/reactflow/nodes'

export const ServicesTreeDiagramNodeType = 'plural-services-tree-node'

export const nodeTypes = {
  [ServicesTreeDiagramNodeType]: ServicesTreeDiagramNode,
}

export function ServicesTreeDiagramNode(
  props: NodeProps<ServiceDeploymentsRowFragment>
) {
  const theme = useTheme()
  const { data } = props

  return (
    <NodeBase
      {...props}
      gap={0}
      padding={0}
      width={336}
    >
      <div
        css={{
          ...theme.partials.text.caption,
          backgroundColor: theme.colors['fill-zero'],
          color: theme.colors['text-xlight'],
          padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
        }}
      >
        {data.repository?.url}
      </div>
      <div
        css={{
          backgroundColor: theme.colors['fill-one'],
          display: 'flex',
          flexDirection: 'column',
          padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
        }}
      >
        <div>{data.name}</div>
        <div>{data.cluster?.name}</div>
      </div>
    </NodeBase>
  )
}
