import {
  ArgoBlueGreenStrategy,
  ArgoCanaryStrategy,
  ArgoRolloutStatusFragment,
} from 'generated/graphql'
import styled, { useTheme } from 'styled-components'

import { Chip, Table } from '@pluralsh/design-system'

import { InfoSection, PaddedCard, PropGroup, PropWideBold } from '../common'

import { StatusChart } from '../Deployment'

import { canarySpecCols } from './CanarySpecTableColumns'

export function CanaryRolloutStrategy({
  strategy,
  numReplicas,
}: {
  strategy: ArgoCanaryStrategy
  numReplicas: number
}) {
  return (
    <InfoSection title="Canary rollout strategy">
      <PaddedCard>
        <PropWideBold title="replica count">{numReplicas}</PropWideBold>
      </PaddedCard>
      <Table
        virtualizeRows
        data={strategy.steps ?? []}
        columns={canarySpecCols}
      />
    </InfoSection>
  )
}

export function BlueGreenRolloutStrategy({
  strategy,
  numReplicas,
}: {
  strategy: ArgoBlueGreenStrategy
  numReplicas: number
}) {
  return (
    <InfoSection title="Blue/green rollout strategy">
      <PropListCard>
        <PropWideBold title="replica count">{numReplicas}</PropWideBold>
        <PropWideBold title="active service">
          {strategy.activeService ?? '-'}
        </PropWideBold>
        <PropWideBold title="auto promotion">
          <Chip
            condensed
            severity={strategy.autoPromotionEnabled ? 'success' : 'warning'}
          >
            {strategy.autoPromotionEnabled ? 'Enabled' : 'Disabled'}
          </Chip>
        </PropWideBold>
        <PropWideBold title="auto promotion seconds">
          {strategy.autoPromotionSeconds ?? '-'}
        </PropWideBold>
      </PropListCard>
    </InfoSection>
  )
}

export function RolloutStatus({
  status,
}: {
  status: ArgoRolloutStatusFragment
}) {
  const theme = useTheme()
  const { replicas, readyReplicas } = status

  return (
    <InfoSection title="Status">
      <PropListCard>
        <PropWideBold title="pause">
          {`${!!status.pauseConditions?.length}`}
        </PropWideBold>
        <PropWideBold title="abort">{`${!!status.abort}`}</PropWideBold>
      </PropListCard>
      <PaddedCard>
        <div
          css={{
            display: 'flex',
            gap: theme.spacing.xlarge,
          }}
        >
          <StatusChart
            width={180}
            height={180}
            available={readyReplicas ?? 0}
            unavailable={(replicas ?? 0) - (readyReplicas ?? 0)}
            pending={0}
          />
          <PropGroup>
            <PropWideBold title="Replicas">{replicas || 0}</PropWideBold>
            <PropWideBold title="Available">{readyReplicas ?? 0}</PropWideBold>
            <PropWideBold title="Unavailable">
              {(replicas ?? 0) - (readyReplicas ?? 0)}
            </PropWideBold>
          </PropGroup>
        </div>
      </PaddedCard>
    </InfoSection>
  )
}

const PropListCard = styled(PaddedCard)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
}))
