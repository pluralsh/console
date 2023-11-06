import { useTheme } from 'styled-components'
import { FormField, Input, ListBoxItem, Select } from '@pluralsh/design-system'

import { CloudSettingsAttributes } from 'generated/graphql'

import { RegionsForProvider } from '../helpers'
import { ProviderCloud } from '../types'
import { CloudSettings, useCreateClusterContext } from '../CreateCluster'

const CLOUD = ProviderCloud.GCP as const

const requiredProps: (keyof CloudSettings<typeof CLOUD>)[] = ['region']

function isRequired(propName: keyof CloudSettings<typeof CLOUD>) {
  return requiredProps.some((p) => p === propName)
}

export function settingsAreValidGcp(
  props: NonNullable<CloudSettingsAttributes[typeof CLOUD]> = {}
) {
  return requiredProps.reduce((acc, reqProp) => acc && !!props?.[reqProp], true)
}

export function GCP() {
  const theme = useTheme()
  const {
    create: {
      attributes: { cloudSettings },
      setGcpSettings,
    },
  } = useCreateClusterContext()
  const settings = cloudSettings?.gcp
  const setSettings = setGcpSettings

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
          placeholder="project-512333"
          value={settings?.project || ''}
          onChange={({ target: { value } }) =>
            setSettings?.({ ...settings, project: value })
          }
          prefix={<div>Project ID{isRequired('project') && '*'}</div>}
        />
        <Input
          placeholder="vpc-network"
          value={settings?.network || ''}
          onChange={({ target: { value } }) =>
            setSettings?.({ ...settings, network: value })
          }
          prefix={<div>VPC Name{isRequired('network') && '*'}</div>}
        />
      </div>
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
          {RegionsForProvider[ProviderCloud.GCP].map((r) => (
            <ListBoxItem
              key={r}
              label={r}
              textValue={r}
            />
          ))}
        </Select>
      </FormField>
      {/* TODO: Enable once node group configuration is supported by cluster create */}
      {/* <NodeGroupContainer provider={Provider.GCP} /> */}
    </div>
  )
}
