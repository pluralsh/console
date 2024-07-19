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
      width={336}
    >
      <div css={{ backgroundColor: theme.colors['fill-zero'] }}>
        {data.repository?.url}
      </div>
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
        <div>{data.cluster?.name}</div>
      </div>
    </NodeBase>
  )
}
