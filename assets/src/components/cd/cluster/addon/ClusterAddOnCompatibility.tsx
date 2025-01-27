import { memo, useMemo } from 'react'
import { useTheme } from 'styled-components'
import {
  CheckIcon,
  CloseIcon,
  EmptyState,
  IconFrame,
  Table,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { coerce, compare } from 'semver'

import { AddonVersion } from 'generated/graphql'
import { TabularNumbers } from 'components/cluster/TableElements'
import { useOutletContext } from 'react-router-dom'

import { ClusterAddOnOutletContextT } from '../ClusterAddOns'

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
        type={isCurrentVersion ? 'floating' : 'tertiary'}
        tooltip={label}
        textValue={label}
        icon={
          isCompatible ? (
            <CheckIcon
              color={theme.colors['icon-success']}
              size={16}
            />
          ) : (
            <CloseIcon
              color={theme.colors['icon-disabled']}
              size={16}
            />
          )
        }
        css={{
          alignSelf: 'center',
          borderRadius: '50%',
          height: 43,
          width: 43,
        }}
      />
    )
  }
)

const columnHelper = createColumnHelper<AddonVersion>()

const generateCompatCol = (kubeVersion: string, currentKubeVersion: string) => {
  const semverColVersion = coerce(kubeVersion)
  const semverCurrentVersion = coerce(currentKubeVersion)
  const highlight =
    semverCurrentVersion?.major === semverColVersion?.major &&
    semverCurrentVersion?.minor === semverColVersion?.minor

  return columnHelper.accessor(
    (row) => row?.kube?.some((k) => k?.trim() === kubeVersion),
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
      }) => (
        <Compatibility
          isCompatible={!!getValue()}
          isCurrentVersion={
            original.version === (meta as any)?.version && highlight
          }
        />
      ),
    }
  )
}

const colVersion = columnHelper.accessor((row) => row, {
  id: 'version',
  header: 'Version',
  meta: { tooltip: 'App version shown on top, chart version shown on bottom' },
  cell: function Cell({
    row: {
      original: { version, chartVersion },
    },
  }) {
    const theme = useTheme()

    return (
      <TabularNumbers>
        <div css={{ ...theme.partials.text.body2LooseLineHeight }}>
          {version}
        </div>
        <div css={{ color: theme.colors['text-xlight'] }}>{chartVersion}</div>
      </TabularNumbers>
    )
  },
})

export default function ClusterAddOnCompatibility() {
  const { addOn, kubeVersion } = useOutletContext<ClusterAddOnOutletContextT>()

  const kubeVersions = useMemo(() => {
    const kubeVs = new Set<string>()

    addOn?.addon?.versions?.forEach((v) => {
      v?.kube?.forEach((k) => {
        if (k) kubeVs.add(k.trim())
      })
    })

    return [...kubeVs].sort(
      (a, b) => -compare(coerce(a) || '', coerce(b) || '')
    )
  }, [addOn?.addon?.versions])

  const columns = useMemo(
    () => [
      colVersion,
      ...kubeVersions.map((kubeV) =>
        generateCompatCol(kubeV, kubeVersion ?? '')
      ),
    ],
    [kubeVersions, kubeVersion]
  )

  if (!addOn?.addon?.versions)
    return <EmptyState message="No version info found." />

  return (
    <Table
      fullHeightWrap
      data={addOn?.addon?.versions || []}
      columns={columns}
      stickyColumn
      highlightedRowId={addOn.addonVersion?.version ?? ''}
      reactTableOptions={{
        getRowId: (row) => row.version,
        meta: { kubeVersion, version: addOn?.addonVersion?.version },
      }}
    />
  )
}
