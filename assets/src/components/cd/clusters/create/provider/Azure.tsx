import { useTheme } from 'styled-components'
import { FormField, Input, ListBoxItem, Select } from '@pluralsh/design-system'

import { CloudSettingsAttributes } from 'generated/graphql'

import { RegionsForProvider } from '../helpers'
import { ProviderCloud } from '../types'
import { CloudSettings, useCreateClusterContext } from '../CreateCluster'

const CLOUD = ProviderCloud.Azure as const

const requiredProps: (keyof CloudSettings<typeof CLOUD>)[] = ['location']

function isRequired(propName: keyof CloudSettings<typeof CLOUD>) {
  return requiredProps.some((p) => p === propName)
}

export function settingsAreValidAzure(
  props: NonNullable<CloudSettingsAttributes[typeof CLOUD]> = {}
) {
  return requiredProps.reduce((acc, reqProp) => acc && !!props?.[reqProp], true)
}

export function Azure() {
  const theme = useTheme()
  const {
    create: {
      attributes: { cloudSettings },
      setAzureSettings,
    },
  } = useCreateClusterContext()
  const settings = cloudSettings?.azure
  const setSettings = setAzureSettings

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.large,
      }}
    >
      <div
        css={{
          display: 'flex',
          gap: theme.spacing.medium,
        }}
      >
        <Input
          css={{ flexBasis: '50%', flexShrink: 1 }}
          placeholder=""
          value={settings?.resourceGroup || ''}
          onChange={({ target: { value } }) =>
            setSettings?.({ ...settings, resourceGroup: value })
          }
          prefix={<div>Resource group{isRequired('resourceGroup') && '*'}</div>}
        />
        <Input
          css={{ flexBasis: '50%', flexShrink: 1 }}
          placeholder="vpc-network"
          value={settings?.network || ''}
          onChange={({ target: { value } }) =>
            setSettings?.({ ...settings, network: value })
          }
          prefix={<div>VPC Name{isRequired('network') && '*'}</div>}
        />
      </div>
      <Input
        css={{ flexGrow: 1, width: '100%' }}
        placeholder=""
        value={settings?.subscriptionId || ''}
        onChange={({ target: { value } }) =>
          setSettings?.({ ...settings, subscriptionId: value })
        }
        prefix={<div>Subscription ID{isRequired('subscriptionId') && '*'}</div>}
      />
      <FormField
        label="Location"
        hint="Location where workload cluster should be created."
        required={isRequired('location')}
      >
        <Select
          aria-label="location"
          selectedKey={settings?.location || ''}
          onSelectionChange={(value) =>
            setSettings?.({
              ...settings,
              location: value as string,
            })
          }
          label="Choose a location"
        >
          {RegionsForProvider[ProviderCloud.Azure].map((r) => (
            <ListBoxItem
              key={r}
              label={r}
              textValue={r}
            />
          ))}
        </Select>
      </FormField>
      {/* TODO: Enable once node group configuration is supported by cluster create */}
      {/* <NodeGroupContainer provider={Provider.AZURE} /> */}
    </div>
  )
}
