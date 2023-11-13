import { ComponentProps } from 'react'
import { useTheme } from 'styled-components'
import { FormField, Input } from '@pluralsh/design-system'

import { ClusterProviderSelect } from '../utils/ProviderSelect'

import { TagSelection } from './TagSelection'

export function GlobalServiceFields({
  name,
  setName,
  tags,
  setTags,
  clusterProviderId: providerId,
  setClusterProviderId,
  clusterProviders,
}: {
  name: string
  setName: (val: string) => void
  tags: Record<string, string>
  setTags: (val: Record<string, string>) => void
  clusterProviderId: string
  setClusterProviderId: (val: string) => void
  clusterProviders: ComponentProps<
    typeof ClusterProviderSelect
  >['clusterProviders']
}) {
  const theme = useTheme()

  return (
    <>
      <FormField
        required
        label="Global service name"
      >
        <Input
          value={name}
          placeholder="Name"
          onChange={(e) => {
            setName(e.currentTarget.value)
          }}
        />
      </FormField>
      <FormField label="Cluster tags">
        <TagSelection
          {...{
            setTags,
            tags,
            theme,
          }}
        />
      </FormField>
      <FormField label="Cluster provider">
        <ClusterProviderSelect
          aria-label="Cluster provider"
          label="Select cluster provider"
          selectedKey={providerId}
          onSelectionChange={(key) => {
            setClusterProviderId(key)
          }}
          clusterProviders={clusterProviders}
        />
      </FormField>
    </>
  )
}
