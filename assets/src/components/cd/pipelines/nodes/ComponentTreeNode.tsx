import { Card } from '@pluralsh/design-system'
import { PipelineStageEdgeFragment } from 'generated/graphql'
import { ComponentProps, ReactElement, ReactNode, cloneElement } from 'react'
import { Handle, type NodeProps, Position } from 'reactflow'
import styled, { useTheme } from 'styled-components'
import isEmpty from 'lodash/isEmpty'

import { TreeNodeMeta } from 'components/component/ComponentTree'

import ComponentCard from 'components/apps/app/components/ComponentCard'

import { useNodeEdges } from '../utils/hooks'

export type CardStatus = 'ok' | 'closed' | 'pending'

const HANDLE_SIZE = 10

export const NodeCardList = styled.ul(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
}))

const BaseNodeSC = styled(Card)(({ theme }) => ({
  '&&': {
    position: 'relative',
    padding: theme.spacing.small,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.small,
    ul: {
      ...theme.partials.reset.list,
    },
    li: {
      ...theme.partials.reset.li,
    },
  },
  '.section': {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xsmall,
  },
  '.headerArea': {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',

    gap: theme.spacing.small,
    minHeight: 22,
    marginTop: -4,
  },
  '.heading': {
    ...theme.partials.text.overline,
    color: theme.colors['text-light'],
  },
  '.subhead': {
    ...theme.partials.text.caption,
    color: theme.colors['text-light'],
  },
}))

const HandleSC = styled(Handle)<{ $isConnected?: boolean; $isOpen?: boolean }>(
  ({ theme, $isConnected, $isOpen = true }) => ({
    '&&': {
      visibility: $isConnected ? 'visible' : 'hidden',
      width: HANDLE_SIZE,
      height: HANDLE_SIZE,
      borderColor: $isOpen
        ? theme.colors['border-secondary']
        : theme.colors.border,
      borderWidth: theme.borderWidths.default,
      backgroundColor: theme.colors['fill-zero'],
      '&.react-flow__handle-left': {
        left: -HANDLE_SIZE / 2,
      },
      '&.react-flow__handle-right': {
        right: -HANDLE_SIZE / 2,
      },
    },
  })
)

export function ComponentTreeNode({
  id,
  data,
  ...props
}: NodeProps<TreeNodeMeta> & ComponentProps<typeof BaseNodeSC>) {
  const { incomers, outgoers } = useNodeEdges(id)
  const { metadata } = data

  return (
    <BaseNodeSC {...props}>
      <HandleSC
        type="target"
        isConnectable={false}
        $isConnected={!isEmpty(incomers)}
        $isOpen
        position={Position.Left}
      />
      <ComponentCard
        component={{ name: metadata?.name || '', kind: data.type }}
      />
      <HandleSC
        type="source"
        isConnectable={false}
        $isConnected={!isEmpty(outgoers)}
        $isOpen
        position={Position.Right}
      />
    </BaseNodeSC>
  )
}

const IconHeadingSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xsmall,
  ...theme.partials.text.body2Bold,
}))

export function IconHeading({
  icon,
  children,
}: {
  icon: ReactElement
  children: ReactNode
}) {
  const theme = useTheme()
  const clonedIcon = cloneElement(icon, {
    size: 12,
    color: theme.colors['icon-light'],
  })

  return (
    <IconHeadingSC>
      {clonedIcon}
      {children}
    </IconHeadingSC>
  )
}

export type EdgeNode = NodeProps<PipelineStageEdgeFragment & TreeNodeMeta>
