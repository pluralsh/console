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
  const { incomers, outgoers } = useNodeEdges(id)

  return (
    <BaseNodeSC {...props}>
      <HandleSC
        type="target"
        isConnectable={false}
        $isConnected={!isEmpty(incomers)}
        position={Position.Left}
      />
      {children}
      <HandleSC
        type="source"
        isConnectable={false}
        $isConnected={!isEmpty(outgoers)}
        position={Position.Right}
      />
    </BaseNodeSC>
  )
}

export function StackStateGraphNode(props: NodeProps<StackStateResource>) {
  const theme = useTheme()
  const [open, setOpen] = useState(false)
  const { data } = props

  return (
    <BaseNode {...props}>
      <div
        css={{
          alignItems: 'center',
          display: 'flex',
          gap: theme.spacing.medium,
          justifyContent: 'center',
        }}
      >
        <div
          css={{
            display: 'flex',
            gap: theme.spacing.xxsmall,
            flexDirection: 'column',
            flexGrow: 1,
            alignItems: 'center',
          }}
        >
          <div
            css={{
              ...theme.partials.text.overline,
              color: theme.colors['text-xlight'],
            }}
          >
            {data.resource}
          </div>
          <div css={{ ...theme.partials.text.body2Bold }}>{data.name}</div>
          <div
            css={{
              ...theme.partials.text.caption,
              color: theme.colors['text-light'],
            }}
          >
            {data.identifier}
          </div>
        </div>
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
    </BaseNode>
  )
}
