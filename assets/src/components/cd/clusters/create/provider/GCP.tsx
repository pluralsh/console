import {
  Dispatch,
  Key,
  ReactElement,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useTheme } from 'styled-components'
import { FormField, Input, ListBoxItem, Select } from '@pluralsh/design-system'

import { RegionsForProvider } from '../helpers'
import { Provider } from '../types'
import { ClusterProvider } from '../../../../../generated/graphql'

interface ProviderState {
  onValidityChange: Dispatch<boolean>
}

interface GCPProps extends ProviderState {
  clusterProviders: Array<ClusterProvider>
}

export function GCP({
  clusterProviders,
  onValidityChange,
}: GCPProps): ReactElement {
  const theme = useTheme()
  const [selectedClusterProvider, setSelectedClusterProvider] = useState<Key>()
  const [selectedRegion, setSelectedRegion] = useState<Key>()
  const valid = useMemo(() => !!selectedClusterProvider && !!selectedRegion, [])

  useEffect(() => onValidityChange?.(valid), [onValidityChange, valid])

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.large,
      }}
    >
      {/* Base: name, handle, version, provider id */}
      <div
        css={{
          display: 'flex',
          gap: theme.spacing.medium,
        }}
      >
        <Input
          width="fit-content"
          placeholder="workload-cluster-name"
          prefix={<div>Name*</div>}
        />
        <Input
          width="fit-content"
          placeholder="custom-name-handle"
          prefix={<div>Handle*</div>}
        />
      </div>
      <FormField
        label="Cluster provider"
        hint="Configured cluster provider that should be used to provision the cluster."
        required
      >
        <Select
          aria-label="cluster provider"
          label="base-cluster-provider"
          selectedKey={selectedClusterProvider}
          onSelectionChange={setSelectedClusterProvider}
        >
          {clusterProviders.map((p) => (
            <ListBoxItem
              key={p.id}
              label={p.name}
              textValue={p.name}
            />
          ))}
        </Select>
      </FormField>
      {/* Additional: project, region, vpc_name */}
      <div
        css={{
          display: 'flex',
          gap: theme.spacing.medium,
        }}
      >
        <Input
          placeholder="project-test-512333"
          prefix={<div>Project ID*</div>}
        />
        <Input
          placeholder="workload-cluster-vpc"
          prefix={<div>VPC Name*</div>}
        />
      </div>
      <FormField
        label="Region"
        hint="Region where workload cluster should be created."
        required
      >
        <Select
          aria-label="region"
          label="us-east1"
          selectedKey={selectedRegion}
          onSelectionChange={setSelectedRegion}
        >
          {RegionsForProvider[Provider.GCP].map((r) => (
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
