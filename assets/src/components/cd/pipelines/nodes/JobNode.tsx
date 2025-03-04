import {
  ArrowTopRightIcon,
  BriefcaseIcon,
  Card,
  Chip,
  IconFrame,
} from '@pluralsh/design-system'
import {
  ContainerSpecFragment,
  GateState,
  PipelineGateFragment,
} from 'generated/graphql'

import { ComponentPropsWithoutRef } from 'react'

import styled from 'styled-components'

import { Link } from 'react-router-dom'

import { PIPELINES_ABS_PATH } from 'routes/cdRoutesConsts'

import {
  PipelineBaseNode,
  IconHeading,
  NodeCardList,
  StatusCard,
  gateStateToCardStatus,
  gateStateToSeverity,
  PipelineGateNodeProps,
} from './PipelineBaseNode'

export const gateStateToJobText = {
  [GateState.Open]: 'Approved',
  [GateState.Pending]: 'Waiting',
  [GateState.Closed]: 'Blocked',
  [GateState.Running]: 'Running',
} as const satisfies Record<GateState, string>

const JobInfoCardSC = styled(StatusCard)(({ theme }) => ({
  '.contentArea': {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.small,
  },
  '.primary': {
    ...theme.partials.text.body2,
    color: theme.colors['text-light'],
  },
  '.secondary': {
    ...theme.partials.text.caption,
    color: theme.colors['text-xlight'],
    marginTop: -theme.spacing.xxxsmall,
  },
}))

export function JobInfoCard({
  gate,
  container: _c,
  ...props
}: {
  gate: PipelineGateFragment
  container?: Nullable<ContainerSpecFragment>
} & Omit<
  ComponentPropsWithoutRef<typeof JobInfoCardSC>,
  'status' | 'statusLabel'
>) {
  return (
    <JobInfoCardSC
      status={gate.state ? gateStateToCardStatus[gate.state] : undefined}
      statusLabel={gate.state ? gateStateToJobText[gate.state] : undefined}
      {...props}
    >
      <div>
        {gate.name && <p className="primary">{gate.name}</p>}
        {gate.spec?.job?.namespace && (
          <p className="secondary">{gate.spec?.job?.namespace}</p>
        )}
      </div>
    </JobInfoCardSC>
  )
}

const ContainerCardSC = styled(Card)(({ theme }) => ({
  '&&': { padding: `${theme.spacing.xsmall}px ${theme.spacing.small}px ` },
  '.contentArea': {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.small,
  },

  '.primary': {
    ...theme.partials.text.body2,
    color: theme.colors['text-light'],
  },
  '.secondary': {
    ...theme.partials.text.caption,
    color: theme.colors['text-xlight'],
    marginTop: -theme.spacing.xxxsmall,
  },
}))

export function ContainerCard({
  container,
  ...props
}: {
  container?: Nullable<ContainerSpecFragment>
} & ComponentPropsWithoutRef<typeof JobInfoCardSC>) {
  if (!container?.image) {
    return null
  }

  return (
    <ContainerCardSC {...props}>
      <div>
        {container.image && <p className="primary">{container.image}</p>}
      </div>
    </ContainerCardSC>
  )
}

const JobNodeSC = styled(PipelineBaseNode)(({ theme }) => ({
  '.headerArea2': { display: 'flex', columnGap: theme.spacing.medium },
}))

export function JobNode({ id, data }: PipelineGateNodeProps) {
  const { meta, ...edge } = data

  const gate = edge?.gates?.[0]
  const containers = gate?.spec?.job?.containers

  if (!gate) return null

  return (
    <JobNodeSC id={id}>
      <div className="headerArea">
        <h2 className="heading">Action</h2>
        {meta.state && (
          <Chip
            fillLevel={0}
            size="small"
            severity={gateStateToSeverity[meta.state]}
          >
            {gateStateToJobText[meta.state]}
          </Chip>
        )}
      </div>
      <div className="headerArea2">
        <IconHeading icon={<BriefcaseIcon />}>Job – {gate.name}</IconHeading>
        <IconFrame
          type="secondary"
          icon={<ArrowTopRightIcon />}
          as={Link}
          to={`${PIPELINES_ABS_PATH}/jobs/${gate.id}`}
        />
      </div>
      {/* <NodeCardList>
        <li>
          <JobInfoCard
            container={containers?.[0]}
            gate={gate}
          />
        </li>
      </NodeCardList> */}
      <NodeCardList>
        <li>
          <ContainerCard
            container={containers?.[0]}
            gate={gate}
            fillLevel={0}
          />
        </li>
      </NodeCardList>
    </JobNodeSC>
  )
}
