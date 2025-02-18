import { NodeProps } from 'reactflow'
import {
  Code,
  IconFrame,
  InfoOutlineIcon,
  Modal,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import { useState } from 'react'

import { StackStateResource } from '../../../generated/graphql'
import { NodeBase } from '../../utils/reactflow/nodes'

export function StackStateGraphNode(props: NodeProps<StackStateResource>) {
  const theme = useTheme()
  const [open, setOpen] = useState(false)
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
          <IconFrame
            clickable
            icon={<InfoOutlineIcon />}
            onClick={(e) => {
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
    </NodeBase>
  )
}
