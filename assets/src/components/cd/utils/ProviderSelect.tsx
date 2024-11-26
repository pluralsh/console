import { ListBoxItem, Select, SelectProps } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import ProviderIcon, { getProviderIconUrl } from 'components/utils/Provider'

import { ReactNode } from 'react'

import { ClusterProvider } from '../../../generated/graphql'

export function ClusterProviderSelect({
  clusterProviders,
  ...props
}: {
  clusterProviders: (Pick<ClusterProvider, 'name' | 'id' | 'cloud'> & {
    icon?: ReactNode
  })[]
} & Omit<SelectProps, 'children' | 'selectionMode'>) {
  const theme = useTheme()

  const selectedProvider = clusterProviders.find(
    (p) => p.id === props.selectedKey
  )

  return (
    <Select
      leftContent={
        selectedProvider
          ? selectedProvider.icon || (
              <ProviderIcon
                provider={selectedProvider.cloud}
                width={16}
              />
            )
          : undefined
      }
      {...props}
      selectionMode="single"
    >
      {clusterProviders.map((p) => (
        <ListBoxItem
          key={p.id}
          label={p.name}
          leftContent={
            p.icon || (
              <img
                width={16}
                height={16}
                src={getProviderIconUrl(p.cloud, theme.mode)}
              />
            )
          }
        />
      ))}
    </Select>
  )
}
