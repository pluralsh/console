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
            green={readyReplicas ?? 0}
            greenLabel="Ready"
            red={(replicas ?? 0) - (readyReplicas ?? 0)}
            redLabel="Unready"
            yellow={0}
          />
          <PropGroup>
            <PropWideBold title="Replicas">{replicas || 0}</PropWideBold>
            <PropWideBold title="Ready">{readyReplicas ?? 0}</PropWideBold>
            <PropWideBold title="Unready">
              {(replicas ?? 0) - (readyReplicas ?? 0)}
            </PropWideBold>
          </PropGroup>
        </div>
      </PaddedCard>
      <PropListCard>
        <PropWideBold title="pause">
          {`${!!status.pauseConditions?.length}`}
        </PropWideBold>
        <PropWideBold title="abort">{`${!!status.abort}`}</PropWideBold>
      </PropListCard>
    </InfoSection>
  )
}

const PropListCard = styled(PaddedCard)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
}))
