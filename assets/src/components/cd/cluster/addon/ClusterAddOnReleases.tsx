import { useMemo } from 'react'
import { EmptyState, Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { TabularNumbers } from 'components/cluster/TableElements'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import isEmpty from 'lodash/isEmpty'

import { useOutletContext } from 'react-router-dom'

import { InlineLink } from '../../../utils/typography/InlineLink'
import {
  ClusterAddOnOutletContextT,
  versionPlaceholder,
} from '../ClusterAddOns'

type Release = {
  version: string
  url: string
}

const columnHelper = createColumnHelper<Release>()

const columns = [
  columnHelper.accessor((row) => row.version, {
    id: 'version',
    header: 'Version',
    cell: ({ getValue }) => <TabularNumbers>{getValue()}</TabularNumbers>,
  }),
  columnHelper.accessor((row) => row.url, {
    id: 'url',
    header: 'URL',
    cell: ({ getValue }) => (
      <InlineLink href={getValue()}>{getValue()}</InlineLink>
    ),
  }),
]

export default function ClusterAddOnReleases() {
  const { addOn } = useOutletContext<ClusterAddOnOutletContextT>()

  const releases: Release[] = useMemo(() => {
    const template = addOn?.addon?.releaseUrl

    if (!template) return []

    return (addOn?.addon?.versions || []).map((addonVersion) => ({
      version: addonVersion?.version ?? '',
      url: template.replace(versionPlaceholder, addonVersion?.version ?? ''),
    }))
  }, [addOn])

  if (isEmpty(releases)) return <EmptyState message="No releases found." />

  return (
    <FullHeightTableWrap>
      <Table
        data={releases}
        columns={columns}
        reactTableOptions={{ getRowId: (row) => row.version }}
        css={{
          maxHeight: 'unset',
          height: '100%',
        }}
      />
    </FullHeightTableWrap>
  )
}
