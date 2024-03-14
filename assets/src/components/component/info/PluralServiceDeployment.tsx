import { useOutletContext } from 'react-router-dom'
import { useTheme } from 'styled-components'
import { PluralServiceDeploymentFragment } from 'generated/graphql'

import { useMemo } from 'react'

import { RawYaml } from '../ComponentRaw'

import { InfoSectionH2 } from './common'
import { ConditionsTable } from './Conditions'

function getSpecRaw(componentRaw: Nullable<string>) {
  let json: Record<string, any> | undefined

  try {
    json = JSON.parse(componentRaw || '')
  } catch (e) {
    json = undefined
  }

  return json?.spec
}

export default function PluralServiceDeployment() {
  const theme = useTheme()
  const { data } = useOutletContext<any>()

  const serviceDeployment =
    data?.pluralServiceDeployment as Nullable<PluralServiceDeploymentFragment>

  const specRaw = useMemo(
    () => getSpecRaw(serviceDeployment?.raw),
    [serviceDeployment?.raw]
  )

  if (!serviceDeployment) return null
  const status = serviceDeployment?.status

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        gap: theme.spacing.large,
      }}
    >
      <section>
        <InfoSectionH2 css={{ marginBottom: theme.spacing.medium }}>
          Conditions
        </InfoSectionH2>
        <ConditionsTable conditions={status.conditions} />
      </section>
      <section>
        <InfoSectionH2
          css={{
            marginBottom: theme.spacing.medium,
          }}
        >
          Spec
        </InfoSectionH2>
        <RawYaml raw={specRaw} />
      </section>
    </div>
  )
}
