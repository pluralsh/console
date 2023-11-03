import { ReactElement } from 'react'
import { FormField, ListBoxItem, Select } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import { CloudSettingsAttributes } from 'generated/graphql'

import { ProviderCloud } from '../types'
import { RegionsForProvider } from '../helpers'
import { CloudSettings, useCreateClusterContext } from '../CreateCluster'

const CLOUD = ProviderCloud.AWS as const

const requiredProps: (keyof CloudSettings<typeof CLOUD>)[] = ['region']

function isRequired(propName: keyof CloudSettings<typeof CLOUD>) {
  return requiredProps.some((p) => p === propName)
}

export function settingsAreValidAws(
  props: NonNullable<CloudSettingsAttributes[typeof CLOUD]> = {}
) {
  return requiredProps.reduce((acc, reqProp) => acc && !!props?.[reqProp], true)
}

export function AWS(): ReactElement {
  const theme = useTheme()
  const {
    create: {
      attributes: { cloudSettings },
      setAwsSettings,
    },
  } = useCreateClusterContext()
  const settings = cloudSettings?.aws
  const setSettings = setAwsSettings

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.large,
      }}
    >
      <FormField
        label="Region"
        hint="Region where workload cluster should be created."
        required={isRequired('region')}
      >
        <Select
          aria-label="region"
          selectedKey={settings?.region || ''}
          onSelectionChange={(value) =>
            setSettings?.({
              ...settings,
              region: value as string,
            })
          }
          label="Choose a region"
        >
          {RegionsForProvider[ProviderCloud.AWS].map((r) => (
            <ListBoxItem
              key={r}
              label={r}
              textValue={r}
            />
          ))}
        </Select>
      </FormField>
      {/* <NodeGroupContainer provider={ProviderCloud.AWS} /> */}
    </div>
  )
}
