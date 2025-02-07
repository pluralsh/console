import { useMemo } from 'react'
import { useTheme } from 'styled-components'
import { EmptyState, Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { coerce, compare } from 'semver'

import { CloudAddonVersionInformation } from 'generated/graphql'
import { TabularNumbers } from 'components/cluster/TableElements'
import { useOutletContext } from 'react-router-dom'
import { ClusterCloudAddOnOutletContextT } from '../ClusterCloudAddon.tsx'
import { Compatibility } from './Compatibility.tsx'

const columnHelper = createColumnHelper<CloudAddonVersionInformation>()

const generateCompatCol = (kubeVersion: string, currentKubeVersion: string) => {
  const semverColVersion = coerce(kubeVersion)
  const semverCurrentVersion = coerce(currentKubeVersion)
  const highlight =
    semverCurrentVersion?.major === semverColVersion?.major &&
    semverCurrentVersion?.minor === semverColVersion?.minor

  return columnHelper.accessor(
    (row) => row?.compatibilities?.some((k) => k?.trim() === kubeVersion),
    {
      id: `compat-${kubeVersion}`,
      header: () => (
        <div
          css={{
            alignItems: 'center',
            display: 'flex',
            inset: 0,
            justifyContent: 'center',
            position: 'absolute',
          }}
        >
          {kubeVersion}
        </div>
      ),
      meta: { highlight },
      cell: ({
        getValue,
        row: { original },
        table: {
          options: { meta },
        },
      }) => {
        console.log(original.version)
        console.log(highlight)
        console.log(kubeVersion)

        return (
          <Compatibility
            isCompatible={!!getValue()}
            isCurrentVersion={
              original.version === (meta as any)?.version && highlight
            }
          />
        )
      },
    }
  )
}

const colVersion = columnHelper.accessor((row) => row.version, {
  id: 'version',
  header: 'Version',
  cell: function Cell({ getValue }) {
    const theme = useTheme()

    return (
      <TabularNumbers>
        <div css={{ ...theme.partials.text.body2LooseLineHeight }}>
          {getValue()}
        </div>
      </TabularNumbers>
    )
  },
})

export default function ClusterCloudAddOnCompatibility() {
  const { cloudAddon, kubeVersion } =
    useOutletContext<ClusterCloudAddOnOutletContextT>()

  const kubeVersions = useMemo(() => {
    const kubeVs = new Set<string>()

    cloudAddon?.info?.versions?.forEach((v) => {
      v?.compatibilities?.forEach((k) => {
        if (k) kubeVs.add(k.trim())
      })
    })

    return [...kubeVs].sort(
      (a, b) => -compare(coerce(a) || '', coerce(b) || '')
    )
  }, [cloudAddon?.info?.versions])

  const columns = useMemo(
    () => [
      colVersion,
      ...kubeVersions.map((kubeV) =>
        generateCompatCol(kubeV, kubeVersion ?? '')
      ),
    ],
    [kubeVersions, kubeVersion]
  )

  if (!cloudAddon?.info?.versions)
    return <EmptyState message="No version info found." />

  return (
    <Table
      fullHeightWrap
      data={cloudAddon?.info?.versions || []}
      columns={columns}
      stickyColumn
      highlightedRowId={cloudAddon?.version ?? ''}
      reactTableOptions={{
        getRowId: (row) => row.version,
        meta: { kubeVersion, version: cloudAddon?.version },
      }}
    />
  )
}
