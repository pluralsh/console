import {
  Card,
  Chip,
  ClusterIcon,
  ListIcon,
  ThumbsUpIcon,
} from '@pluralsh/design-system'
import {
  GateState,
  PipelineGateFragment,
  PipelineStageEdgeFragment,
  PipelineStageFragment,
} from 'generated/graphql'
import {
  ComponentProps,
  ReactElement,
  ReactNode,
  cloneElement,
  useMemo,
} from 'react'
import { Handle, type NodeProps, Position, useEdges, useNodes } from 'reactflow'
import styled, { useTheme } from 'styled-components'
import isEmpty from 'lodash/isEmpty'
import upperFirst from 'lodash/upperFirst'

import { ServiceStatusChip } from '../services/ServiceStatusChip'

const StageNodeSC = styled(Card)(({ theme }) => ({
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
  '.serviceList': {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xsmall,
  },
  '.section': {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xsmall,
  },
  '.headerArea': {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.small,
    minHeight: 22,
    marginTop: -4,
  },
  '.heading': {
    ...theme.partials.text.overline,
    color: theme.colors['text-light'],
  },
  '.name': {
    ...theme.partials.text.body1Bold,
    color: theme.colors['text-light'],
  },
  '.subhead': {
    ...theme.partials.text.caption,
    color: theme.colors['text-light'],
  },
}))
const ServiceCardSC = styled(Card)(({ theme }) => ({
  '&&': {
    ...theme.partials.text.body2,
    color: theme.colors['text-light'],
    padding: `${theme.spacing.xsmall}px ${theme.spacing.small}px`,
    display: 'flex',
    gap: theme.spacing.xsmall,
    alignItems: 'center',
  },
}))
const HANDLE_SIZE = 10
const HandleSC = styled(Handle).attrs(() => ({
  isConnectable: false,
}))(({ theme }) => ({
  '&&': {
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderColor: theme.colors['border-secondary'],
    borderWidth: theme.borderWidths.default,
    '&.react-flow__handle-left': {
      left: -HANDLE_SIZE / 2,
    },
    '&.react-flow__handle-right': {
      right: -HANDLE_SIZE / 2,
    },
  },
}))

export const useNodeEdges = () => {
  const edges = useEdges()
  const nodes = useNodes()

  return useMemo(
    () =>
      Object.fromEntries(
        nodes.map((node) => {
          const ret = [
            node.id,
            {
              source: edges.filter((e) => e.source === node.id),
              target: edges.filter((e) => e.target === node.id),
            },
          ]

          return ret
        })
      ),
    [edges, nodes]
  )
}
export function StageNode({ data }: NodeProps<PipelineStageFragment>) {
  return (
    <StageNodeSC>
      <HandleSC
        type="target"
        position={Position.Left}
      />
      <h2 className="heading">STAGE</h2>
      <IconHeading icon={<ClusterIcon />}>Deploy to {data.name}</IconHeading>

      {!isEmpty(data.services) && (
        <div className="section">
          {/* <h4 className="subhead">Services</h4> */}

          <ul className="serviceList">
            {data.services?.map((service) => (
              <li>
                <ServiceCardSC>
                  <div>{service?.service?.name}</div>
                  <ServiceStatusChip
                    size="small"
                    status={service?.service?.status}
                  />
                </ServiceCardSC>
              </li>
            ))}
          </ul>
        </div>
      )}
      <HandleSC
        type="source"
        position={Position.Right}
        id="a"
      />
    </StageNodeSC>
  )
}
const IconHeadingSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xsmall,
  ...theme.partials.text.body2Bold,
}))

const gateStateToSeverity = {
  [GateState.Open]: 'success',
  [GateState.Closed]: 'critical',
  [GateState.Pending]: 'warning',
} as const satisfies Record<GateState, ComponentProps<typeof Chip>['severity']>

function IconHeading({
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

export function ApprovalNode({ data: gate }: NodeProps<PipelineGateFragment>) {
  return (
    <StageNodeSC>
      <HandleSC
        type="target"
        position={Position.Left}
      />
      <div className="headerArea">
        <h2 className="heading">Action</h2>
        <Chip
          size="small"
          severity={gateStateToSeverity[gate.state]}
        >
          {upperFirst(gate.state.toLowerCase())}
        </Chip>
      </div>
      <IconHeading icon={<ThumbsUpIcon />}>Approval</IconHeading>
      {gate.approver && <div>Approver: {gate.approver.name}</div>}
      <HandleSC
        type="source"
        position={Position.Right}
        id="a"
      />
    </StageNodeSC>
  )
}

export function TestsNode({
  data: edge,
}: NodeProps<PipelineStageEdgeFragment>) {
  return (
    <StageNodeSC>
      <HandleSC
        type="target"
        position={Position.Left}
      />
      <div className="headerArea">
        <h2 className="heading">Action</h2>
        {/* <Chip
          size="small"
          severity={gateStateToSeverity[data.state]}
        >
          {upperFirst(data.state.toLowerCase())}
        </Chip> */}
      </div>
      <IconHeading icon={<ListIcon />}>Tests</IconHeading>
      {/* {data.approver && <div>{data.approver.name}</div>} */}
      <ul className="serviceList">
        {edge.gates?.map((gate) => (
          <li>
            <ServiceCardSC>
              <div>{gate?.name}</div>
              {/* <ServiceStatusChip
              size="small"
              status={gate?.state}
            /> */}
            </ServiceCardSC>
          </li>
        ))}
      </ul>
      <HandleSC
        type="source"
        position={Position.Right}
        id="a"
      />
    </StageNodeSC>
  )
}
