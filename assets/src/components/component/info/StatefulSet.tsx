import { useOutletContext } from 'react-router-dom'
import { useTheme } from 'styled-components'

import { InfoSection, PaddedCard, PropGroup, PropWideBold } from './common'
import { StatusChart } from './Deployment'
import { ConditionsTable } from './Conditions'
import { ComponentDetailsContext } from '../ComponentDetails'
import { StatefulSetQuery } from 'generated/graphql'

export default function StatefulSet() {
  const theme = useTheme()
  const {
    data: { statefulSet },
  } = useOutletContext<ComponentDetailsContext>() as {
    data: StatefulSetQuery
  }

  if (!statefulSet) return null

  const {
    spec,
    status: {
      replicas,
      currentReplicas,
      updatedReplicas,
      readyReplicas,
      conditions,
    },
  } = statefulSet

  return (
    <>
      <InfoSection title="Status">
        <PaddedCard css={{ display: 'flex', gap: theme.spacing.xlarge }}>
          <StatusChart
            width={180}
            height={180}
            green={readyReplicas ?? 0}
            greenLabel="Ready"
            red={(replicas ?? 0) - (readyReplicas ?? 0)}
            redLabel="Not ready"
            yellow={0}
          />
          <PropGroup>
            <PropWideBold title="Replicas">{replicas || 0}</PropWideBold>
            <PropWideBold title="Current replicas">
              {currentReplicas || 0}
            </PropWideBold>
            <PropWideBold title="Updated replicas">
              {updatedReplicas || 0}
            </PropWideBold>
            <PropWideBold title="Ready replicas">
              {readyReplicas || 0}
            </PropWideBold>
          </PropGroup>
        </PaddedCard>
      </InfoSection>
      <InfoSection title="Spec">
        <PaddedCard>
          <PropWideBold title="Service name">
            {spec?.serviceName || '-'}
          </PropWideBold>
        </PaddedCard>
      </InfoSection>
      {conditions && (
        <InfoSection
          css={{ minWidth: '100%' }}
          title="Conditions"
        >
          <ConditionsTable conditions={conditions} />
        </InfoSection>
      )}
    </>
  )
}
