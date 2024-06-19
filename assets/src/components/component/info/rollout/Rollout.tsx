import { useOutletContext } from 'react-router-dom'
import styled from 'styled-components'

import { ArgoRolloutQueryResult } from 'generated/graphql'

import { InfoSection } from '../common'
import { ConditionsTable } from '../Conditions'

import {
  BlueGreenRolloutStrategy,
  CanaryRolloutStrategy,
  RolloutStatus,
} from './RolloutSections'

export function Rollout() {
  const { data } = useOutletContext<ArgoRolloutQueryResult>()

  if (!data?.argoRollout) return null

  const { spec, status } = data.argoRollout

  return (
    <RolloutSectionWrapperSC>
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
      <RolloutStatus status={status} />
      <InfoSection title="Conditions">
        <ConditionsTable conditions={status.conditions} />
      </InfoSection>
    </RolloutSectionWrapperSC>
  )
}

const RolloutSectionWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  flexGrow: 1,
  gap: theme.spacing.xxlarge,
  marginBottom: theme.spacing.xlarge,
}))
