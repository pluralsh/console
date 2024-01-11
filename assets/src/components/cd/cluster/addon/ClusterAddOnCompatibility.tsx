import { memo, useMemo } from 'react'
import { useTheme } from 'styled-components'
import { CheckIcon, CloseIcon, IconFrame, Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { coerce, compare } from 'semver'

import { ScrollablePage } from 'components/utils/layout/ScrollablePage'

import { AddonVersion } from 'generated/graphql'

import { TabularNumbers } from 'components/cluster/TableElements'

import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'

import { useClusterAddOnContext } from './ClusterAddOnDetails'

const Compatibility = memo(({ isCompatible }: { isCompatible: boolean }) => {
  const theme = useTheme()

  return (
    <IconFrame
      size="small"
      icon={
        isCompatible ? (
          <CheckIcon color={theme.colors['icon-success']} />
        ) : (
          // eslint-disable-next-line react/jsx-no-useless-fragment
          <CloseIcon
            color={theme.colors['icon-default']}
            css={{ opacity: 0.05 }}
          />
        )
      }
    />
  )
})

const columnHelper = createColumnHelper<AddonVersion>()

const generateCompatCol = (version: string) =>
  columnHelper.accessor(
    (row) => row?.kube?.some((k) => k?.trim() === version),
    {
      id: `compat-${version}`,
      header: version,
      cell: ({ getValue }) => <Compatibility isCompatible={!!getValue()} />,
    }
  )

const colVersion = columnHelper.accessor((row) => row.version, {
  id: 'version',
  header: 'Version',
  cell: ({ getValue }) => <TabularNumbers>{getValue()}</TabularNumbers>,
})

export default function ClusterAddOnCompatibility() {
  const { addOn } = useClusterAddOnContext()

  const kubeVersions = useMemo(() => {
    const kubeVs = new Set<string>()

    addOn.addon?.versions?.forEach((v) => {
      v?.kube?.forEach((k) => {
        if (k) kubeVs.add(k.trim())
      })
    })

    return [...kubeVs].sort((a, b) => compare(coerce(a) || '', coerce(b) || ''))
  }, [addOn.addon?.versions])

  const columns = useMemo(
    () => [
      colVersion,
      ...kubeVersions.map((kubeV) => generateCompatCol(kubeV)),
    ],
    [kubeVersions]
  )

  return (
    <ScrollablePage
      heading="Compatibility"
      scrollable={false}
    >
      {addOn?.addon?.versions && (
        <FullHeightTableWrap>
          <Table
            data={addOn?.addon?.versions || []}
            columns={columns}
            reactTableOptions={{
              getRowId: (row) => row.version,
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
