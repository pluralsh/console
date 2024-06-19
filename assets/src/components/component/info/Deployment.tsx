import { PieChart } from 'components/utils/PieChart'
import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTheme } from 'styled-components'

import { DeploymentFragment } from 'generated/graphql'

import { InfoSectionH2, PaddedCard, PropGroup, PropWideBold } from './common'

export function StatusChart({
  available,
  unavailable,
  pending,
  width,
  height,
}: {
  available: number
  unavailable: number
  pending: number
  width?: number | string
  height?: number | string
}) {
  const theme = useTheme()
  const data = useMemo(
    () => [
      { id: 'Available', value: available, color: theme.colors.semanticGreen },
      {
        id: 'Unavailable',
        value: unavailable,
        color: theme.colors.semanticRedLight,
      },
      { id: 'Pending', value: pending, color: theme.colors.semanticYellow },
    ],
    [
      available,
      unavailable,
      pending,
      theme.colors.semanticGreen,
      theme.colors.semanticRedLight,
      theme.colors.semanticYellow,
    ]
  )

  return (
    <PieChart
      data={data}
      {...{
        width,
        height,
      }}
    />
  )
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
          <StatusChart
            width={180}
            height={180}
            available={availableReplicas ?? 0}
            unavailable={unavailableReplicas ?? 0}
            pending={
              (replicas ?? 0) -
              (availableReplicas ?? 0) -
              (unavailableReplicas ?? 0)
            }
          />
          <PropGroup>
            <PropWideBold title="Replicas">{replicas || 0}</PropWideBold>
            <PropWideBold title="Available">
              {availableReplicas || 0}
            </PropWideBold>
            <PropWideBold title="Unavailable">
              {unavailableReplicas || 0}
            </PropWideBold>
          </PropGroup>
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
