import { useOutletContext } from 'react-router-dom'
import { useTheme } from 'styled-components'

import { useMemo } from 'react'

import { RawYaml } from '../ComponentRaw'

import { ComponentDetailsContext } from '../ComponentDetails'
import { InfoSection } from './common'
import { ConditionsTable } from './Conditions'

function getSpecRaw(componentRaw: Nullable<string>) {
  let json: Record<string, any> | undefined

  try {
    json = JSON.parse(componentRaw || '')
  } catch (_) {
    json = undefined
  }

  return json?.spec
}

export default function PluralServiceDeployment() {
  const theme = useTheme()
  const { componentDetails: serviceDeployment } =
    useOutletContext<ComponentDetailsContext>()

  const specRaw = useMemo(
    () =>
      serviceDeployment?.__typename === 'PluralServiceDeployment' &&
      getSpecRaw(serviceDeployment?.raw),
    [serviceDeployment]
  )
  if (serviceDeployment?.__typename !== 'PluralServiceDeployment') return null
  const status = serviceDeployment?.status

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        gap: theme.spacing.large,
      }}
    >
      <InfoSection title="Conditions">
        <ConditionsTable conditions={status.conditions} />
      </InfoSection>
      <InfoSection title="Spec">
        <RawYaml raw={specRaw} />
      </InfoSection>
    </div>
  )
}
