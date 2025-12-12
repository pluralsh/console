import {
  ArrowTopRightIcon,
  BriefcaseIcon,
  Card,
  IconFrame,
} from '@pluralsh/design-system'
import { ContainerSpecFragment, GateState } from 'generated/graphql'

import { ComponentPropsWithoutRef } from 'react'

import styled from 'styled-components'

import { Link } from 'react-router-dom'

import { PIPELINES_ABS_PATH } from 'routes/cdRoutesConsts'

import { StretchedFlex } from 'components/utils/StretchedFlex'
import { StackedText } from 'components/utils/table/StackedText'
import { GateNodeHeaderChip } from './ApprovalNode'
import {
  NodeCardList,
  PipelineBaseNode,
  PipelineGateNodeProps,
} from './PipelineBaseNode'

export const gateStateToJobText = {
  [GateState.Open]: 'Approved',
  [GateState.Pending]: 'Waiting',
  [GateState.Closed]: 'Blocked',
  [GateState.Running]: 'Running',
} as const satisfies Record<GateState, string>

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
} & ComponentPropsWithoutRef<typeof ContainerCardSC>) {
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

export function JobNode({ id, data }: PipelineGateNodeProps) {
  const { meta, ...edge } = data

  const gate = edge?.gates?.[0]
  const containers = gate?.spec?.job?.containers

  if (!gate) return null

  return (
    <PipelineBaseNode
      id={id}
      headerText="action"
      headerChip={<GateNodeHeaderChip state={meta.state} />}
    >
      <StretchedFlex>
        <StackedText
          icon={<IconFrame icon={<BriefcaseIcon />} />}
          iconGap="xsmall"
          first="Job"
          firstPartialType="body2Bold"
          firstColor="text"
          second={gate.name ?? 'Unknown name'}
        />
        <IconFrame
          type="secondary"
          icon={<ArrowTopRightIcon />}
          clickable
          as={Link}
          to={`${PIPELINES_ABS_PATH}/jobs/${gate.id}`}
          tooltip="View job details"
        />
      </StretchedFlex>
      <NodeCardList>
        <li>
          <ContainerCard
            container={containers?.[0]}
            gate={gate}
          />
        </li>
      </NodeCardList>
    </PipelineBaseNode>
  )
}
