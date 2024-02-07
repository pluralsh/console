import { useMemo } from 'react'
import { Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { useAddonReleaseUrlQuery } from 'generated/graphql'
import { TabularNumbers } from 'components/cluster/TableElements'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import isEmpty from 'lodash/isEmpty'

import LoadingIndicator from '../../../utils/LoadingIndicator'
import { GqlError } from '../../../utils/Alert'
import { InlineLink } from '../../../utils/typography/InlineLink'

import { useClusterAddOnContext } from './ClusterAddOnDetails'

type Release = {
  version: string
  url: string
}

const versionPlaceholder = '_VSN_PLACEHOLDER_'

const columnHelper = createColumnHelper<Release>()

const colVersion = columnHelper.accessor((row) => row.version, {
  id: 'version',
  header: 'Version',
  cell: ({ getValue }) => <TabularNumbers>{getValue()}</TabularNumbers>,
})

const colRelease = columnHelper.accessor((row) => row.url, {
  id: 'url',
  header: 'URL',
  cell: ({ getValue }) => (
    <InlineLink href={getValue()}>{getValue()}</InlineLink>
  ),
})

export default function ClusterAddOnReleases() {
  const { runtimeService: rts } = useClusterAddOnContext()

  const columns = useMemo(() => [colVersion, colRelease], [])

  const { data, loading, error } = useAddonReleaseUrlQuery({
    variables: { id: rts?.id, version: versionPlaceholder },
  })

  const releases: Release[] = useMemo(() => {
    const template = data?.runtimeService?.addon?.releaseUrl

    if (!template) return []

    return (rts?.addon?.versions || []).map((addonVersion) => ({
      version: addonVersion?.version ?? '',
      url: template.replace(versionPlaceholder, addonVersion?.version ?? ''),
    }))
  }, [data, rts])

  if (loading) return <LoadingIndicator />

  if (error)
    return (
      <GqlError
        header="Could not fetch release URL"
        error={error}
      />
    )

  return (
    <ScrollablePage
      heading="Releases"
      scrollable={false}
    >
      {!isEmpty(releases) && (
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
      )}
    </ScrollablePage>
  )
}
