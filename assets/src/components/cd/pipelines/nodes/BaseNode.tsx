import {
  Card,
  Chip,
  CloseRoundedIcon,
  Spinner,
  StatusOkIcon,
  Tooltip,
} from '@pluralsh/design-system'
import { GateState, PipelineStageEdgeFragment } from 'generated/graphql'
import {
  ComponentProps,
  ComponentPropsWithoutRef,
  ReactElement,
  ReactNode,
  cloneElement,
  useMemo,
} from 'react'
import {
  Handle,
  type Node,
  type NodeProps,
  Position,
  useNodes,
} from 'reactflow'
import styled, { useTheme } from 'styled-components'
import isEmpty from 'lodash/isEmpty'

import { useNodeEdges } from '../utils/hooks'
import { reduceGateStates } from '../utils/reduceGateStatuses'

export type CardStatus = 'ok' | 'closed' | 'pending'

const HANDLE_SIZE = 10

export const gateStateToCardStatus = {
  [GateState.Open]: 'ok',
  [GateState.Closed]: 'closed',
  [GateState.Pending]: 'pending',
} as const satisfies Record<GateState, CardStatus>

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

export function BaseNode({
  id,
  data: { meta },
  children,
}: NodeProps<NodeMeta> & { children: ReactNode }) {
  const { incomers, outgoers } = useNodeEdges(id)
  const nodes = useNodes()

  const reducedInState = useMemo(() => {
    const incomingNodes = nodes.filter((node) =>
      incomers.some((incomer) => incomer.source === node.id)
    )

    return reduceGateStates(
      incomingNodes.map((inNode) => ({
        state: (inNode as Node<NodeMeta>)?.data?.meta?.state,
      }))
    )
  }, [incomers, nodes])

  return (
    <BaseNodeSC>
      <HandleSC
        type="target"
        isConnectable={false}
        $isConnected={!isEmpty(incomers)}
        $isOpen={reducedInState === GateState.Open}
        position={Position.Left}
      />
      {children}
      <HandleSC
        type="source"
        isConnectable={false}
        $isConnected={!isEmpty(outgoers)}
        $isOpen={meta.state === GateState.Open}
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
} as const satisfies Record<GateState, ComponentProps<typeof Chip>['severity']>

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

export type NodeMeta = { meta: { state: GateState } }

export type EdgeNode = NodeProps<PipelineStageEdgeFragment & NodeMeta>

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
                size={12}
                color={theme.colors['icon-success']}
              />
            ) : status === 'closed' ? (
              <CloseRoundedIcon
                size={12}
                color={theme.colors['icon-danger-critical']}
              />
            ) : (
              <div>
                <Spinner
                  size={12}
                  color={theme.colors['icon-warning']}
                />
              </div>
            )}
          </Tooltip>
        </div>
      )}
    </StatusCardSC>
  )
}

const ServiceCardSC = styled(StatusCard)(({ theme }) => ({
  '.contentArea': {
    ...theme.partials.text.body2,
    color: theme.colors['text-light'],
  },
}))

export function ServiceCard({
  state,
  ...props
}: ComponentPropsWithoutRef<typeof ServiceCardSC>) {
  return (
    <ServiceCardSC
      state={state}
      {...props}
    />
  )
}
