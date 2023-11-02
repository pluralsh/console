import { useEffect, useMemo } from 'react'
import { useTheme } from 'styled-components'
import { FormField, Input, ListBoxItem, Select } from '@pluralsh/design-system'

import { RegionsForProvider } from '../helpers'
import { ProviderCloud } from '../types'
import { useCreateClusterContext } from '../CreateCluster'

export function GCP({
  onValidityChange,
}: {
  onValidityChange: (valid: boolean) => void
}) {
  const theme = useTheme()
  const {
    create: {
      attributes: { cloudSettings },
      setGcpSettings,
    },
  } = useCreateClusterContext()
  const settings = cloudSettings?.gcp
  const setSettings = setGcpSettings

  const valid = useMemo(() => !!settings?.region, [settings?.region])

  useEffect(() => onValidityChange?.(valid), [onValidityChange, valid])

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
          prefix={<div>Project ID</div>}
        />
        <Input
          placeholder="vpc-network"
          value={settings?.network || ''}
          onChange={({ target: { value } }) =>
            setSettings?.({ ...settings, network: value })
          }
          prefix={<div>VPC Name</div>}
        />
      </div>
      <FormField
        label="Region"
        hint="Region where workload cluster should be created."
        required
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
