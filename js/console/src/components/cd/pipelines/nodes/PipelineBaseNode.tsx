import {
  CancelledFilledIcon,
  Card,
  Chip,
  Flex,
  IconFrame,
  Spinner,
  StatusOkIcon,
  Tooltip,
} from '@pluralsh/design-system'
import { type Node, type NodeProps, Position } from '@xyflow/react'
import {
  GateState,
  PipelineStageEdgeFragment,
  PipelineStageFragment,
} from 'generated/graphql'
import isEmpty from 'lodash/isEmpty'
import {
  cloneElement,
  ComponentProps,
  ComponentPropsWithoutRef,
  ComponentPropsWithRef,
  ReactElement,
  ReactNode,
} from 'react'
import styled, { useTheme } from 'styled-components'

import { useNodeEdges } from 'components/hooks/reactFlowHooks'

import { StretchedFlex } from 'components/utils/StretchedFlex'
import { OverlineH1 } from 'components/utils/typography/Text'
import { NodeBaseCardSC, NodeHandleSC } from '../../../utils/reactflow/nodes'
import { StageStatus } from './StageNode'

type PipelineGateNodeMeta = { meta: { state: GateState } }
type PipelineStageNodeMeta = { meta: { stageStatus: StageStatus } }

type PipelineStageNode = Node<PipelineStageFragment & PipelineStageNodeMeta>
type PipelineGateNode = Node<PipelineStageEdgeFragment & PipelineGateNodeMeta>

export type PipelineStageNodeProps = NodeProps<PipelineStageNode>
export type PipelineGateNodeProps = NodeProps<PipelineGateNode>

export type CardStatus = 'ok' | 'closed' | 'pending' | 'running'

export const gateStateToCardStatus = {
  [GateState.Open]: 'ok',
  [GateState.Closed]: 'closed',
  [GateState.Pending]: 'pending',
  [GateState.Running]: 'running',
} as const satisfies Record<GateState, CardStatus>

export const NodeCardList = styled.ul(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
}))

export const BaseNodeSC = styled(NodeBaseCardSC)(({ theme }) => ({
  '&&': {
    position: 'relative',
    minWidth: 180,
    background: theme.colors['fill-one'],
    display: 'flex',
    flexDirection: 'column',
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
    padding: theme.spacing.small,

    gap: theme.spacing.small,
    minHeight: 22,
    marginTop: -4,
  },
  '.heading': {
    ...theme.partials.text.overline,
    lineHeight: '1px',
    color: theme.colors['text-xlight'],
  },
  '.subhead': {
    ...theme.partials.text.caption,
    color: theme.colors['text-light'],
  },
}))

export function PipelineBaseNode({
  id,
  children,
  headerText,
  headerChip,
  ...props
}: Pick<PipelineStageNodeProps | PipelineGateNodeProps, 'id'> &
  ComponentPropsWithRef<typeof BaseNodeSC> & {
    headerText?: string
    headerChip?: ReactNode
  }) {
  const { borders } = useTheme()
  const { incomers, outgoers } = useNodeEdges(id)

  return (
    <BaseNodeSC {...props}>
      <NodeHandleSC
        type="target"
        isConnectable={false}
        $isConnected={!isEmpty(incomers)}
        position={Position.Left}
      />
      <StretchedFlex
        gap="small"
        minHeight={22}
        padding="small"
        borderBottom={borders['fill-two']}
      >
        <OverlineH1
          as="h2"
          $color="text-xlight"
        >
          {headerText}
        </OverlineH1>
        {headerChip}
      </StretchedFlex>
      <Flex
        direction="column"
        gap="small"
        padding="small"
      >
        {children}
      </Flex>
      <NodeHandleSC
        type="source"
        isConnectable={false}
        $isConnected={!isEmpty(outgoers)}
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

export const gateStateToSeverity = {
  [GateState.Open]: 'success',
  [GateState.Closed]: 'critical',
  [GateState.Pending]: 'warning',
  [GateState.Running]: 'info',
} as const satisfies Record<GateState, ComponentProps<typeof Chip>['severity']>

export function IconHeading({
  icon,
  children,
}: {
  icon: ReactElement<any>
  children: ReactNode
}) {
  const theme = useTheme()
  const clonedIcon = cloneElement(icon, {
    size: 14,
    color: theme.colors['icon-light'],
  })

  return (
    <IconHeadingSC>
      <IconFrame
        icon={clonedIcon}
        css={{ flexShrink: 0 }}
      />
      {children}
    </IconHeadingSC>
  )
}

const StatusCardSC = styled(Card)(({ theme }) => ({
  '&&': {
    padding: `${theme.spacing.xsmall}px ${theme.spacing.small}px`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.small,
  },
  '.state': {
    display: 'flex',
    alignItems: 'center',
  },
}))

export function StatusCard({
  status,
  statusLabel,
  children,
  ...props
}: {
  status: Nullable<CardStatus>
  statusLabel?: Nullable<string>
} & ComponentPropsWithoutRef<typeof StatusCardSC>) {
  const theme = useTheme()

  return (
    <StatusCardSC {...props}>
      <div className="contentArea">{children}</div>
      {status && (
        <div className="state">
          <Tooltip label={statusLabel}>
            {status === 'ok' ? (
              <StatusOkIcon
                size={20}
                color={theme.colors['icon-success']}
              />
            ) : status === 'closed' ? (
              <CancelledFilledIcon
                size={20}
                color={theme.colors['icon-danger-critical']}
              />
            ) : (
              <div>
                <Spinner
                  size={20}
                  color={
                    status === 'running'
                      ? theme.colors['icon-info']
                      : theme.colors['icon-warning']
                  }
                />
              </div>
            )}
          </Tooltip>
        </div>
      )}
    </StatusCardSC>
  )
}
