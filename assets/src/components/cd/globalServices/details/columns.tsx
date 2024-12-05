import { GlobeIcon, IconFrame } from '@pluralsh/design-system'
import { AccessorFnColumnDef, createColumnHelper } from '@tanstack/react-table'
import { useTheme } from 'styled-components'
import { ServiceDeployment } from '../../../../generated/graphql.ts'
import { DistroProviderIcon } from '../../../utils/ClusterDistro.tsx'
import DecoratedName from '../../services/DecoratedName.tsx'

const columnHelper = createColumnHelper<ServiceDeployment>()

const ColOwnedService = columnHelper.accessor((row) => row, {
  id: 'owned',
  header: 'Owned service',
  cell: function Cell({ getValue }) {
    const service = getValue()
    return service && <DecoratedName>{service.name}</DecoratedName>
  },
})

const ColDistribution = columnHelper.accessor((row) => row, {
  id: 'distribution',
  header: 'Distribution',
  cell: function Cell({ getValue }) {
    const service = getValue()
    const theme = useTheme()

    return (
      <div
        css={{
          ...theme.partials.text.body2,
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.small,
        }}
      >
        <IconFrame
          size="small"
          type="secondary"
          icon={
            service?.cluster ? (
              <DistroProviderIcon
                distro={service?.cluster.distro}
                provider={service?.cluster.provider?.name}
                size={16}
              />
            ) : (
              <GlobeIcon size={16} />
            )
          }
        />
        {service?.cluster?.distro || 'All distribution'}
      </div>
    )
  },
})

export const columns: Array<
  AccessorFnColumnDef<ServiceDeployment, ServiceDeployment>
> = [ColOwnedService, ColDistribution]
