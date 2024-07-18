import { NodeProps, Position } from 'reactflow'
import isEmpty from 'lodash/isEmpty'
import {
  Code,
  IconFrame,
  InfoOutlineIcon,
  Modal,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import { ComponentProps, ReactNode, useState } from 'react'

import { BaseNodeSC, HandleSC } from '../../cd/pipelines/nodes/BaseNode'
import { StackStateResource } from '../../../generated/graphql'
import { useNodeEdges } from '../../hooks/reactFlowHooks'

export function BaseNode({
  id,
  children,
  ...props
}: NodeProps & { children: ReactNode } & ComponentProps<typeof BaseNodeSC>) {
  const theme = useTheme()
  const { incomers, outgoers } = useNodeEdges(id)

  return (
    <BaseNodeSC {...props}>
      <HandleSC
        type="target"
        isConnectable={false}
        $isConnected={!isEmpty(incomers)}
        position={Position.Left}
        css={{
          '&&': {
            backgroundColor: theme.colors.border,
            borderColor: theme.colors.border,
          },
        }}
      />
      {children}
      <HandleSC
        type="source"
        isConnectable={false}
        $isConnected={!isEmpty(outgoers)}
        position={Position.Right}
        css={{
          '&&': {
            backgroundColor: theme.colors.border,
            borderColor: theme.colors.border,
          },
        }}
      />
    </BaseNodeSC>
  )
}

export function StackStateGraphNode(props: NodeProps<StackStateResource>) {
  const theme = useTheme()
  const [open, setOpen] = useState(false)
  const { data } = props

  return (
    <BaseNode
      {...props}
      css={{
        backgroundColor: theme.colors['fill-zero'],
        '&&': { minWidth: 200 },
      }}
    >
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
          <IconFrame
            clickable
            icon={<InfoOutlineIcon />}
            onClick={(e: Event) => {
              e.stopPropagation()
              setOpen(true)
            }}
            tooltip="See configuration"
          />
          <Modal
            header={`${data.identifier} configuration`}
            size="large"
            onClose={() => setOpen(false)}
            open={open}
            portal
          >
            <Code
              language="JSON"
              maxHeight="80vh"
              overflow="auto"
            >
              {JSON.stringify(data.configuration ?? {}, null, 2)}
            </Code>
          </Modal>
        </div>

        <div
          css={{
            ...theme.partials.text.caption,
            color: theme.colors['text-light'],
          }}
        >
          {data.identifier}
        </div>
      </div>
    </BaseNode>
  )
}
