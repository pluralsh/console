import { useOutletContext } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'

import { ArgoRolloutQueryResult } from 'generated/graphql'

import { InfoSection } from '../common'
import { ConditionsTable } from '../Conditions'

import {
  BlueGreenRolloutStrategy,
  CanaryRolloutStrategy,
  RolloutStatus,
} from './RolloutSections'

export function Rollout() {
  const theme = useTheme()
  const { data } = useOutletContext<ArgoRolloutQueryResult>()

  if (!data?.argoRollout) return null

  const { spec, status } = data.argoRollout

  return (
    <div css={{ display: 'flex', gap: theme.spacing.xxlarge, flex: 1 }}>
      <RolloutSectionColumnSC>
        {spec.strategy?.canary ? (
          <CanaryRolloutStrategy
            numReplicas={spec.replicas ?? 0}
            strategy={spec.strategy.canary}
          />
        ) : spec.strategy?.blueGreen ? (
          <BlueGreenRolloutStrategy
            numReplicas={spec.replicas ?? 0}
            strategy={spec.strategy.blueGreen}
          />
        ) : null}
        <InfoSection title="Conditions">
          <ConditionsTable conditions={status.conditions} />
        </InfoSection>
      </RolloutSectionColumnSC>
      <RolloutSectionColumnSC>
        <RolloutStatus status={status} />
      </RolloutSectionColumnSC>
    </div>
  )
}

const RolloutSectionColumnSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  gap: theme.spacing.xxlarge,
  marginBottom: theme.spacing.xlarge,
}))
