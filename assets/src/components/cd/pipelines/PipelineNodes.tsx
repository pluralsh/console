import {
  AppIcon,
  Card,
  Chip,
  CloseRoundedIcon,
  ClusterIcon,
  Spinner,
  StatusOkIcon,
  TestTubeIcon,
  ThumbsUpIcon,
  Tooltip,
} from '@pluralsh/design-system'
import {
  GateState,
  PipelineGateFragment,
  PipelineStageEdgeFragment,
  PipelineStageFragment,
  ServiceDeploymentStatus,
} from 'generated/graphql'
import {
  ComponentProps,
  ComponentPropsWithoutRef,
  ReactElement,
  ReactNode,
  cloneElement,
  useMemo,
} from 'react'
import {
  type Edge,
  Handle,
  type NodeProps,
  Position,
  useEdges,
  useNodes,
} from 'reactflow'
import styled, { useTheme } from 'styled-components'
import isEmpty from 'lodash/isEmpty'
import upperFirst from 'lodash/upperFirst'
import { MergeDeep } from 'type-fest'

type CardStatus = 'ok' | 'closed' | 'pending'

const serviceStateToCardStatus = {
  [ServiceDeploymentStatus.Healthy]: 'ok',
  [ServiceDeploymentStatus.Synced]: 'ok',
  [ServiceDeploymentStatus.Stale]: 'pending',
  [ServiceDeploymentStatus.Failed]: 'closed',
} as const satisfies Record<ServiceDeploymentStatus, CardStatus>

const gateStateToCardStatus = {
  [GateState.Open]: 'ok',
  [GateState.Closed]: 'closed',
  [GateState.Pending]: 'pending',
} as const satisfies Record<GateState, CardStatus>

const gateStateToApprovalText = {
  [GateState.Open]: 'Approved',
  [GateState.Pending]: 'Waiting',
  [GateState.Closed]: 'Blocked',
} as const satisfies Record<GateState, string>

const gateStateToTestText = {
  [GateState.Open]: 'Passed',
  [GateState.Pending]: 'In progress',
  [GateState.Closed]: 'Failed',
} as const satisfies Record<GateState, string>

const NodeCardList = styled.ul(({ theme }) => ({
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

const HANDLE_SIZE = 10
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

export enum StageStatus {
  Complete = 'Complete',
  Pending = 'Pending',
}
const stageStatusToSeverity = {
  [StageStatus.Complete]: 'success',
  [StageStatus.Pending]: 'warning',
} as const satisfies Record<
  StageStatus,
  ComponentProps<typeof Chip>['severity']
>

export function getStageStatus(
  stage: Pick<PipelineStageFragment, 'promotion'>
) {
  const promotedDate = new Date(stage.promotion?.promotedAt || '')
  const revisedDate = new Date(stage.promotion?.revisedAt || '')

  if (promotedDate > revisedDate) {
    return StageStatus.Complete
  }

  return StageStatus.Pending
}

export function BaseNode({
  id,
  data: { meta },
  children,
}: NodeProps<NodeMeta> & { children: ReactNode }) {
  const { incomers, outgoers } = useNodeEdges(id)

  return (
    <BaseNodeSC>
      <HandleSC
        type="target"
        $isConnected={!isEmpty(incomers)}
        $isOpen={!isEmpty(incomers)}
        position={Position.Left}
      />
      {children}
      <HandleSC
        type="source"
        $isConnected={!isEmpty(outgoers)}
        $isOpen={meta.state === GateState.Open}
        position={Position.Right}
      />
    </BaseNodeSC>
  )
}

const useNodeEdges = (nodeId: Nullable<string>) => {
  const edges = useEdges()
  const outgoers = useMemo(
    () => edges.filter((edge) => edge.source === nodeId),
    [edges, nodeId]
  )
  const incomers = useMemo(
    () => edges.filter((edge) => edge.target === nodeId),
    [edges, nodeId]
  )

  return useMemo(() => ({ outgoers, incomers }), [incomers, outgoers])
}

export const useEdgeNodes = (edge: Pick<Edge, 'source' | 'target'>) => {
  const nodes = useNodes()
  const source = useMemo(
    () => nodes.find((node) => node.id === edge.source),
    [nodes, edge.source]
  )
  const target = useMemo(
    () => nodes.find((node) => node.id === edge.target),
    [nodes, edge.target]
  )

  return useMemo(() => ({ source, target }), [source, target])
}

export function StageNode(
  props: NodeProps<
    PipelineStageFragment &
      MergeDeep<NodeMeta, { meta: { stageStatus: StageStatus } }>
  >
) {
  const {
    data: { meta, ...stage },
  } = props
  const status = meta.stageStatus

  return (
    <BaseNode {...props}>
      <div className="headerArea">
        <h2 className="heading">STAGE</h2>
        <Chip
          size="small"
          severity={stageStatusToSeverity[status]}
        >
          {status}
        </Chip>
      </div>
      <IconHeading icon={<ClusterIcon />}>Deploy to {stage.name}</IconHeading>

      {!isEmpty(stage.services) && (
        <div className="section">
          {/* <h4 className="subhead">Services</h4> */}

          <NodeCardList>
            {stage.services?.map((service) => (
              <li>
                <ServiceCard
                  status={
                    service?.service?.status
                      ? serviceStateToCardStatus[service?.service?.status]
                      : undefined
                  }
                  statusLabel={upperFirst(
                    service?.service?.status.toLowerCase?.()
                  )}
                >
                  <div>{service?.service?.name}</div>
                </ServiceCard>
              </li>
            ))}
          </NodeCardList>
        </div>
      )}
    </BaseNode>
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

type NodeMeta = { meta: { state: GateState } }

type StageNode = NodeProps<PipelineStageEdgeFragment & NodeMeta>

type EdgeNode = NodeProps<PipelineStageEdgeFragment & NodeMeta>

export function ApprovalNode(props: EdgeNode) {
  const {
    data: { meta, ...edge },
  } = props

  const gates = edge?.gates

  return (
    <BaseNode {...props}>
      <div className="headerArea">
        <h2 className="heading">Action</h2>
        {meta.state && (
          <Chip
            size="small"
            severity={gateStateToSeverity[meta.state]}
          >
            {gateStateToApprovalText[meta.state]}
          </Chip>
        )}
      </div>
      <IconHeading icon={<ThumbsUpIcon />}>Approval</IconHeading>
      {gates?.map((gate) =>
        gate?.approver ? (
          <ApproverCard gate={gate} />
        ) : (
          gate && (
            <ServiceCard
              status={gateStateToCardStatus[gate.state]}
              statusLabel={gateStateToApprovalText[gate.state]}
            >
              {gate.name}
            </ServiceCard>
          )
        )
      )}
    </BaseNode>
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

function StatusCard({
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

const ApproverCardSC = styled(StatusCard)(({ theme }) => ({
  '.contentArea': {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.small,
  },
  '.name': {
    ...theme.partials.text.body2,
    color: theme.colors['text-light'],
  },
  '.email': {
    ...theme.partials.text.caption,
    color: theme.colors['text-xlight'],
    marginTop: -theme.spacing.xxxsmall,
  },
}))

function ApproverCard({
  gate,
  ...props
}: { gate: PipelineGateFragment } & ComponentPropsWithoutRef<
  typeof ApproverCardSC
>) {
  const { approver } = gate

  if (!approver) {
    return null
  }

  return (
    <ApproverCardSC
      status={gate.state ? gateStateToCardStatus[gate.state] : undefined}
      statusLabel={gate.state ? gateStateToApprovalText[gate.state] : undefined}
      {...props}
    >
      <AppIcon
        size="xxsmall"
        name={approver.name}
        url={approver.profile ?? undefined}
        spacing="none"
      />
      <div>
        <p className="name">{approver.name}</p>
        <p className="email">{approver.email}</p>
      </div>
    </ApproverCardSC>
  )
}

const ServiceCardSC = styled(StatusCard)(({ theme }) => ({
  '.contentArea': {
    ...theme.partials.text.body2,
    color: theme.colors['text-light'],
  },
}))

function ServiceCard({
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
export function TestsNode(props: EdgeNode) {
  const {
    data: { meta, ...edge },
  } = props
  const gates = edge?.gates

  return (
    <BaseNode {...props}>
      {meta.state && (
        <div className="headerArea">
          <h2 className="heading">Action</h2>
          <Chip
            size="small"
            severity={gateStateToSeverity[meta.state]}
          >
            {gateStateToTestText[meta.state]}
          </Chip>
        </div>
      )}
      <IconHeading icon={<TestTubeIcon />}>Run test group</IconHeading>
      <NodeCardList>
        {gates?.map(
          (gate) =>
            gate && (
              <li>
                <StatusCard
                  status={
                    gate.state ? gateStateToCardStatus[gate.state] : undefined
                  }
                  statusLabel={
                    gate.state ? gateStateToTestText[gate.state] : undefined
                  }
                >
                  {gate.name}
                </StatusCard>
              </li>
            )
        )}
      </NodeCardList>
    </BaseNode>
  )
}
