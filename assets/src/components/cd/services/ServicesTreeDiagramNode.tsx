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
    <NodeBase {...props}>
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          css={{
            ...theme.partials.text.body2Bold,
            alignItems: 'center',
            display: 'flex',
            justifyContent: 'space-between',
            gap: theme.spacing.medium,
          }}
        >
          <div>{data.name}</div>
        </div>

        <div
          css={{
            ...theme.partials.text.caption,
            color: theme.colors['text-light'],
          }}
        >
          {data.id}
        </div>
      </div>
    </NodeBase>
  )
}
