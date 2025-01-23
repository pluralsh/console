import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'
import { useTheme } from 'styled-components'
import {
  AppIcon,
  LoopingLogo,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  useFetchPaginatedData,
} from '../utils/table/useFetchPaginatedData.tsx'
import { FullHeightTableWrap } from '../utils/layout/FullHeightTableWrap.tsx'
import {
  ClusterRegistrationFragment,
  useClusterRegistrationsQuery,
} from '../../generated/graphql.ts'
import { useMemo } from 'react'
import { mapExistingNodes } from '../../utils/graphql.ts'
import { createColumnHelper } from '@tanstack/react-table'
import { DateTimeCol } from '../utils/table/DateTimeCol.tsx'
import { GqlError } from '../utils/Alert.tsx'

import { EDGE_BASE_CRUMBS } from '../../routes/edgeRoutes.tsx'
import { Flex } from 'honorable'
import { StackedText } from '../utils/table/StackedText.tsx'

export const columnHelper = createColumnHelper<ClusterRegistrationFragment>()

const columns = [
  columnHelper.accessor((registration) => registration.machineId, {
    id: 'machineId',
    header: 'Machine ID',
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor(() => null, {
    id: 'cluster',
    header: 'Cluster',
    cell: ({
      row: {
        original: { name, handle },
      },
    }) => (
      <StackedText
        first={name}
        second={handle ? `handle: ${handle}` : undefined}
      />
    ),
  }),
  columnHelper.accessor((registration) => registration.creator, {
    id: 'creator',
    header: 'Creator',
    cell: ({ getValue }) => {
      const creator = getValue()

      return (
        <Flex
          align="center"
          gap="xsmall"
        >
          {(creator?.profile || creator?.name) && (
            <AppIcon
              url={creator?.profile ?? undefined}
              name={creator?.name}
              size="xxsmall"
              spacing="none"
            />
          )}
          {creator?.email}
        </Flex>
      )
    },
  }),
  columnHelper.accessor((registration) => registration.insertedAt, {
    id: 'insertedAt',
    header: 'Created',
    enableSorting: true,
    enableGlobalFilter: true,
    cell: ({ getValue }) => <DateTimeCol date={getValue()} />,
  }),
]

export default function Edge() {
  const theme = useTheme()

  useSetBreadcrumbs(EDGE_BASE_CRUMBS)

  const {
    data,
    loading,
    error,
    refetch,
    pageInfo,
    fetchNextPage,
    setVirtualSlice,
  } = useFetchPaginatedData({
    queryHook: useClusterRegistrationsQuery,
    keyPath: ['clusterRegistrations'],
  })

  const clusterRegistrations = useMemo(
    () => mapExistingNodes(data?.clusterRegistrations),
    [data?.clusterRegistrations]
  )

  if (error) return <GqlError error={error} />

  if (!data) return <LoopingLogo />

  return (
    <ResponsivePageFullWidth
      scrollable={false}
      headingContent={
        <div css={{ ...theme.partials.text.subtitle1 }}>
          Edge cluster registrations
        </div>
      }
    >
      <FullHeightTableWrap>
        <Table
          columns={columns}
          reactTableOptions={{ meta: { refetch } }}
          reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
          data={clusterRegistrations}
          virtualizeRows
          hasNextPage={pageInfo?.hasNextPage}
          fetchNextPage={fetchNextPage}
          isFetchingNextPage={loading}
          onVirtualSliceChange={setVirtualSlice}
          css={{
            maxHeight: 'unset',
            height: '100%',
          }}
        />
      </FullHeightTableWrap>
    </ResponsivePageFullWidth>
  )
}
