import { Chip, ClusterIcon } from '@pluralsh/design-system'
import {
  PipelineStageFragment,
  ServiceDeploymentStatus,
} from 'generated/graphql'
import { ComponentProps } from 'react'
import { type NodeProps } from 'reactflow'
import isEmpty from 'lodash/isEmpty'
import upperFirst from 'lodash/upperFirst'
import { MergeDeep } from 'type-fest'

import {
  BaseNode,
  CardStatus,
  IconHeading,
  NodeCardList,
  NodeMeta,
  ServiceCard,
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
