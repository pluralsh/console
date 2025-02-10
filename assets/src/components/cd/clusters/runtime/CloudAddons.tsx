import { Table } from '@pluralsh/design-system'
import { CloudAddonFragment, RuntimeServicesQuery } from 'generated/graphql'
import { useMemo } from 'react'
import { isNonNullable } from 'utils/isNonNullable'
import { useNavigate } from 'react-router-dom'
import { Row } from '@tanstack/react-table'

import { getClusterAddOnDetailsPath } from '../../../../routes/cdRoutesConsts'

import { cloudColumns } from './columns'

export default function CloudAddons({
  data,
  flush,
}: {
  data?: RuntimeServicesQuery
  flush?: boolean
}) {
  const navigate = useNavigate()
  const addOns = useMemo(
    () => data?.cluster?.cloudAddons?.filter(isNonNullable) || [],
    [data?.cluster?.cloudAddons]
  )

  if ((data?.cluster?.cloudAddons || []).length <= 0)
    return <p style={{ marginLeft: '1rem' }}>No Cloud Add-Ons Detected</p>

  return (
    <Table
      flush={flush}
      data={addOns}
      columns={cloudColumns}
      reactTableOptions={{ meta: { clusterId: data?.cluster?.id } }}
      onRowClick={(_, { original }: Row<CloudAddonFragment>) =>
        navigate(
          getClusterAddOnDetailsPath({
            clusterId: data?.cluster?.id,
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
