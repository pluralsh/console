import { ListBoxItem, Select } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import ProviderIcon, { getProviderIconURL } from 'components/utils/Provider'
import { SelectProps } from '@pluralsh/design-system/dist/components/Select'

import { ClusterProvider } from '../../../generated/graphql'

export function ClusterProviderSelect({
  clusterProviders,
  ...props
}: {
  clusterProviders: Pick<ClusterProvider, 'name' | 'id' | 'cloud'>[]
} & Omit<SelectProps, 'children' | 'selectionMode'>) {
  const theme = useTheme()

  const selectedProvider = clusterProviders.find(
    (p) => p.id === props.selectedKey
  )

  return (
    <Select
      leftContent={
        selectedProvider ? (
          <ProviderIcon
            provider={selectedProvider.cloud}
            width={16}
          />
        ) : undefined
      }
      {...props}
      selectionMode="single"
    >
      {clusterProviders.map((p) => (
        <ListBoxItem
          key={p.id}
          label={p.name}
          leftContent={
            <img
              width={16}
              height={16}
              src={getProviderIconURL(p.cloud, theme.mode === 'dark')}
            />
          }
        />
      ))}
    </Select>
  )
}
