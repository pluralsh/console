import { useMemo } from 'react'
import { Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { AddonVersion } from 'generated/graphql'
import { TabularNumbers } from 'components/cluster/TableElements'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'

import { useClusterAddOnContext } from './ClusterAddOnDetails'

const columnHelper = createColumnHelper<AddonVersion>()

const colVersion = columnHelper.accessor((row) => row.version, {
  id: 'version',
  header: 'Version',
  cell: ({ getValue }) => <TabularNumbers>{getValue()}</TabularNumbers>,
})

const colRelease = columnHelper.accessor((row) => row.version, {
  id: 'url',
  header: 'URL',
  cell: ({ getValue }) => <TabularNumbers>{getValue()}</TabularNumbers>,
})

export default function ClusterAddOnReleases() {
  const { runtimeService: rts } = useClusterAddOnContext()

  const columns = useMemo(() => [colVersion, colRelease], [])

  return (
    <ScrollablePage
      heading="Releases"
      scrollable={false}
    >
      {rts?.addon?.versions && (
        <FullHeightTableWrap>
          <Table
            data={rts?.addon?.versions || []}
            columns={columns}
            reactTableOptions={{
              getRowId: (row) => row.version,
              meta: {
                version: rts?.addonVersion?.version,
              },
            }}
            css={{
              maxHeight: 'unset',
              height: '100%',
            }}
          />
        </FullHeightTableWrap>
      )}
    </ScrollablePage>
  )
}
