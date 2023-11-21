import { Chip, ClusterIcon } from '@pluralsh/design-system'
import {
  PipelineStageFragment,
  ServiceDeploymentStatus,
} from 'generated/graphql'
import { ComponentProps, ComponentPropsWithoutRef } from 'react'
import { type NodeProps } from 'reactflow'
import isEmpty from 'lodash/isEmpty'
import upperFirst from 'lodash/upperFirst'
import { MergeDeep } from 'type-fest'

import { getServiceDetailsPath } from 'routes/cdRoutesConsts'

import { useNavigate } from 'react-router-dom'

import styled from 'styled-components'

import {
  BaseNode,
  CardStatus,
  IconHeading,
  NodeCardList,
  NodeMeta,
  StatusCard,
} from './BaseNode'

const serviceStateToCardStatus = {
  [ServiceDeploymentStatus.Healthy]: 'ok',
  [ServiceDeploymentStatus.Synced]: 'ok',
  [ServiceDeploymentStatus.Stale]: 'pending',
  [ServiceDeploymentStatus.Failed]: 'closed',
} as const satisfies Record<ServiceDeploymentStatus, CardStatus>

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
const ServiceCardSC = styled(StatusCard)(({ theme }) => ({
  '.serviceName': {
    ...theme.partials.text.body2,
    color: theme.colors['text-light'],
  },
  '.clusterName': {
    ...theme.partials.text.caption,
    color: theme.colors['text-xlight'],
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

export function StageNode(
  props: NodeProps<
    PipelineStageFragment &
      MergeDeep<NodeMeta, { meta: { stageStatus: StageStatus } }>
  >
) {
  const navigate = useNavigate()
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
          <NodeCardList>
            {stage.services?.map((stageService) => (
              <li>
                <ServiceCard
                  clickable
                  onClick={() => {
                    navigate(
                      getServiceDetailsPath({
                        clusterId: stageService?.service?.cluster?.id,
                        serviceId: stageService?.service?.id,
                      })
                    )
                  }}
                  status={
                    stageService?.service?.status
                      ? serviceStateToCardStatus[stageService?.service?.status]
                      : undefined
                  }
                  statusLabel={upperFirst(
                    stageService?.service?.status.toLowerCase?.()
                  )}
                >
                  <div className="serviceName">
                    {stageService?.service?.name}
                  </div>
                  <div className="clusterName">
                    {stageService?.service?.cluster?.name}
                  </div>
                </ServiceCard>
              </li>
            ))}
          </NodeCardList>
        </div>
      )}
    </BaseNode>
  )
}
