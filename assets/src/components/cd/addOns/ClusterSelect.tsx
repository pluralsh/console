import {
  ClusterIcon,
  ListBoxItem,
  Select,
  SelectPropsSingle,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import { ClusterTinyFragment } from 'generated/graphql'
import ProviderIcon from 'components/utils/Provider'

export function ClusterSelect({
  clusters,
  ...props
}: { clusters: ClusterTinyFragment[] } & Omit<SelectPropsSingle, 'children'>) {
  const theme = useTheme()
  const { selectedKey } = props

  const currentCluster = clusters.find((cluster) => cluster.id === selectedKey)

  return (
    <Select
      titleContent={
        <div css={{ display: 'flex', gap: theme.spacing.xsmall }}>
          <ClusterIcon />
          Cluster
        </div>
      }
      leftContent={
        <ProviderIcon
          provider={currentCluster?.provider?.cloud || ''}
          width={16}
        />
      }
      {...props}
    >
      {clusters.map((cluster) => (
        <ListBoxItem
          key={cluster.id}
          label={cluster.name}
          textValue={cluster.name}
          leftContent={
            <ProviderIcon
              provider={cluster.provider?.cloud || ''}
              width={16}
            />
          }
        />
      ))}
    </Select>
  )
}
