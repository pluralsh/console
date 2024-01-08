import { PieChart } from 'components/utils/PieChart'
import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTheme } from 'styled-components'

import { DeploymentFragment } from 'generated/graphql'

import { InfoSectionH2, PaddedCard, PropWideBold } from './common'

export function StatusChart({
  available,
  unavailable,
  pending,
}: {
  available: number
  unavailable: number
  pending: number
}) {
  const data = useMemo(
    () => [
      { id: 'Available', value: available, color: '#99F5D5' },
      { id: 'Unavailable', value: unavailable, color: '#F599A8' },
      { id: 'Pending', value: pending, color: '#FFF9C2' },
    ],
    [available, unavailable, pending]
  )

  return <PieChart data={data} />
}

export default function DeploymentOutlet() {
  const { data } = useOutletContext<any>()

  return <DeploymentBase deployment={data?.deployment} />
}

export function DeploymentBase({
  deployment,
}: {
  deployment: Nullable<DeploymentFragment>
}) {
  const theme = useTheme()

  if (!deployment) return null

  const {
    spec,
    status: { availableReplicas, replicas, unavailableReplicas },
  } = deployment

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
      }}
    >
      <InfoSectionH2 css={{ marginBottom: theme.spacing.medium }}>
        Status
      </InfoSectionH2>
      <PaddedCard>
        <div
          css={{
            display: 'flex',
            gap: theme.spacing.xlarge,
          }}
        >
          <div
            css={{
              display: 'flex',
              width: 180,
              height: 180,
            }}
          >
            <StatusChart
              available={availableReplicas ?? 0}
              unavailable={unavailableReplicas ?? 0}
              pending={
                (replicas ?? 0) -
                (availableReplicas ?? 0) -
                (unavailableReplicas ?? 0)
              }
            />
          </div>
          <div
            css={{
              display: 'flex',
              flexDirection: 'column',
              flexGrow: 1,
              justifyContent: 'center',
            }}
          >
            <PropWideBold title="Replicas">{replicas || 0}</PropWideBold>
            <PropWideBold title="Available">
              {availableReplicas || 0}
            </PropWideBold>
            <PropWideBold title="Unavailable">
              {unavailableReplicas || 0}
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
        <PropWideBold title="Strategy">
          {spec?.strategy?.type || '-'}
        </PropWideBold>
      </PaddedCard>
    </div>
  )
}
