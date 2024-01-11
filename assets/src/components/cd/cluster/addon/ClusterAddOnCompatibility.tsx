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

const Compatibility = memo(
  ({
    isCompatible,
    isCurrentVersion,
  }: {
    isCompatible: boolean
    isCurrentVersion: boolean
  }) => {
    const theme = useTheme()
    const label = isCurrentVersion
      ? 'Current'
      : isCompatible
      ? 'Compatible'
      : 'Not compatible'

    return (
      <IconFrame
        size="small"
        type={isCurrentVersion ? 'secondary' : 'tertiary'}
        tooltip={label}
        textValue={label}
        icon={
          isCompatible ? (
            <CheckIcon color={theme.colors['icon-success']} />
          ) : (
            // eslint-disable-next-line react/jsx-no-useless-fragment
            <CloseIcon
              color={theme.colors['icon-default']}
              css={{ opacity: theme.mode === 'light' ? 0.2 : 0.1 }}
            />
          )
        }
      />
    )
  }
)

const columnHelper = createColumnHelper<AddonVersion>()

const generateCompatCol = (kubeVersion: string) =>
  columnHelper.accessor(
    (row) => row?.kube?.some((k) => k?.trim() === kubeVersion),
    {
      id: `compat-${kubeVersion}`,
      header: kubeVersion,
      cell: ({
        getValue,
        row: { original },
        table: {
          options: { meta },
        },
      }) => {
        const val = getValue()

        const semverColVersion = coerce(kubeVersion)
        const semverVersion = coerce((meta as any)?.kubeVersion)

        const highlight =
          original.version === (meta as any)?.version &&
          semverVersion?.major === semverColVersion?.major &&
          semverVersion?.minor === semverColVersion?.minor

        return (
          <Compatibility
            isCompatible={!!val}
            isCurrentVersion={highlight}
          />
        )
      },
    }
  )

const colVersion = columnHelper.accessor((row) => row.version, {
  id: 'version',
  header: 'Version',
  cell: ({ getValue }) => <TabularNumbers>{getValue()}</TabularNumbers>,
})

export default function ClusterAddOnCompatibility() {
  const { runtimeService: rts, kubeVersion } = useClusterAddOnContext()

  const kubeVersions = useMemo(() => {
    const kubeVs = new Set<string>()

    rts.addon?.versions?.forEach((v) => {
      v?.kube?.forEach((k) => {
        if (k) kubeVs.add(k.trim())
      })
    })

    return [...kubeVs].sort((a, b) => compare(coerce(a) || '', coerce(b) || ''))
  }, [rts.addon?.versions])

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
      {rts?.addon?.versions && (
        <FullHeightTableWrap>
          <Table
            data={rts?.addon?.versions || []}
            columns={columns}
            stickyColumn
            reactTableOptions={{
              getRowId: (row) => row.version,
              meta: {
                kubeVersion,
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
