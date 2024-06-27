import { useOutletContext } from 'react-router-dom'
import { useTheme } from 'styled-components'

import { InfoSection, PaddedCard, PropGroup, PropWideBold } from './common'
import { StatusChart } from './Deployment'

export default function StatefulSet() {
  const theme = useTheme()
  const { data } = useOutletContext<any>()

  if (!data?.statefulSet) return null

  const {
    statefulSet: {
      spec,
      status: { replicas, currentReplicas, updatedReplicas, readyReplicas },
    },
  } = data

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
    </>
  )
}
