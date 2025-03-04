import {
  Card,
  Chip,
  CloseRoundedIcon,
  Spinner,
  StatusOkIcon,
  Tooltip,
} from '@pluralsh/design-system'
import { type Node, type NodeProps } from '@xyflow/react'
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
  use,
} from 'react'
import styled, { useTheme } from 'styled-components'

import { useNodeEdges } from 'components/hooks/reactFlowHooks'

import { GraphLayoutCtx } from 'components/utils/reactflow/graph'
import {
  directionToSourcePosition,
  directionToTargetPosition,
  NodeBaseCardSC,
  NodeHandleSC,
} from '../../../utils/reactflow/nodes'
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

export function PipelineBaseNode({
  id,
  children,
  ...props
}: Pick<PipelineStageNodeProps | PipelineGateNodeProps, 'id'> &
  ComponentPropsWithRef<typeof BaseNodeSC>) {
  const { incomers, outgoers } = useNodeEdges(id)
  const { rankdir = 'LR' } = use(GraphLayoutCtx) ?? {}

  return (
    <BaseNodeSC {...props}>
      <NodeHandleSC
        type="target"
        isConnectable={false}
        $isConnected={!isEmpty(incomers)}
        position={directionToTargetPosition[rankdir]}
      />
      {children}
      <NodeHandleSC
        type="source"
        isConnectable={false}
        $isConnected={!isEmpty(outgoers)}
        position={directionToSourcePosition[rankdir]}
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
              <CloseRoundedIcon
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
