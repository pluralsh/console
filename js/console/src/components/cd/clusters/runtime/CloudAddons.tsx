import { EmptyState, Table } from '@pluralsh/design-system'
import { Row } from '@tanstack/react-table'
import {
  CloudAddonFragment,
  ClusterOverviewDetailsFragment,
} from 'generated/graphql'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { isNonNullable } from 'utils/isNonNullable'

import { getClusterAddOnDetailsPath } from '../../../../routes/cdRoutesConsts'

import { isEmpty } from 'lodash'
import { cloudColumns } from './columns'

export default function CloudAddons({
  cluster,
  flush,
}: {
  cluster: ClusterOverviewDetailsFragment
  flush?: boolean
}) {
  const navigate = useNavigate()
  const addOns = useMemo(
    () => cluster.cloudAddons?.filter(isNonNullable) || [],
    [cluster.cloudAddons]
  )

  if (isEmpty(addOns)) return <EmptyState message="No cloud add-ons detected" />

  return (
    <Table
      flush={flush}
      data={addOns}
      columns={cloudColumns}
      reactTableOptions={{ meta: { clusterId: cluster.id } }}
      onRowClick={(_, { original }: Row<CloudAddonFragment>) =>
        navigate(
          getClusterAddOnDetailsPath({
            clusterId: cluster.id,
            addOnId: original?.id,
            isCloudAddon: true,
          })
        )
      }
      css={{
        maxHeight: 258,
        height: '100%',
      }}
    />
  )
}
