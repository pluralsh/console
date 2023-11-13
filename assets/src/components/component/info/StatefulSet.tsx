import { PieChart } from 'components/utils/PieChart'
import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTheme } from 'styled-components'

import { InfoSectionH2, PaddedCard, PropWideBold } from './common'

function StatusChart({ ready, notReady }: { ready: number; notReady: number }) {
  const data = useMemo(
    () => [
      { id: 'Ready', value: ready, color: '#99F5D5' },
      { id: 'Not ready', value: notReady, color: '#F599A8' },
    ],
    [ready, notReady]
  )

  return <PieChart data={data} />
}

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
    <div css={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      <InfoSectionH2 css={{ marginBottom: theme.spacing.medium }}>
        Status
      </InfoSectionH2>
      <PaddedCard>
        <div css={{ display: 'flex', gap: theme.spacing.xlarge }}>
          <div
            css={{
              display: 'flex',
              width: 180,
              height: 180,
            }}
          >
            <StatusChart
              ready={readyReplicas}
              notReady={replicas - readyReplicas}
            />
          </div>
          <div
            css={{
              flexDirection: 'column',
              flexGrow: 1,
              justifyContent: 'center',
            }}
          >
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
          </div>
        </div>
      </PaddedCard>
      <InfoSectionH2
        css={{
          marginBottom: theme.spacing.medium,
          marginTop: theme.spacing.large,
        }}
      >
        Spec
      </InfoSectionH2>
      <PaddedCard>
        <PropWideBold title="Service name">
          {spec?.serviceName || '-'}
        </PropWideBold>
      </PaddedCard>
    </div>
  )
}
