import { PieChart } from 'components/utils/PieChart'
import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTheme } from 'styled-components'

import { DeploymentFragment } from 'generated/graphql'

import { InfoSection, PaddedCard, PropGroup, PropWideBold } from './common'
import { ConditionsTable } from './Conditions'
import { ComponentDetailsContext } from '../ComponentDetails'

export function StatusChart({
  green,
  red,
  yellow,
  greenLabel = 'Available',
  redLabel = 'Unavailable',
  yellowLabel = 'Pending',
  width,
  height,
}: {
  green: number
  red: number
  yellow: number
  greenLabel?: string
  redLabel?: string
  yellowLabel?: string
  width?: number | string
  height?: number | string
}) {
  const theme = useTheme()
  const data = useMemo(
    () => [
      { id: greenLabel, value: green, color: theme.colors.semanticGreen },
      {
        id: redLabel,
        value: red,
        color: theme.colors.semanticRedLight,
      },
      { id: yellowLabel, value: yellow, color: theme.colors.semanticYellow },
    ],
    [
      greenLabel,
      green,
      theme.colors.semanticGreen,
      theme.colors.semanticRedLight,
      theme.colors.semanticYellow,
      redLabel,
      red,
      yellowLabel,
      yellow,
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
  const { componentDetails } = useOutletContext<ComponentDetailsContext>()

  return (
    componentDetails?.__typename === 'Deployment' && (
      <DeploymentBase deployment={componentDetails} />
    )
  )
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
    status: { availableReplicas, replicas, unavailableReplicas, conditions },
  } = deployment

  return (
    <>
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
              green={availableReplicas ?? 0}
              red={unavailableReplicas ?? 0}
              yellow={
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
      </InfoSection>
      <InfoSection title="Spec">
        <PaddedCard>
          <PropWideBold title="Strategy">
            {spec?.strategy?.type || '-'}
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
