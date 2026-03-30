import { Button, Input2, SearchIcon, Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { useThrottle } from 'components/hooks/useThrottle'
import { GqlError } from 'components/utils/Alert'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { Body1P } from 'components/utils/typography/Text'
import { MonitorTinyFragment, useServiceMonitorsQuery } from 'generated/graphql'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { SERVICE_PARAM_ID } from 'routes/cdRoutesConsts'
import styled from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'

export function ServiceMonitors() {
  const [q, setQ] = useState('')
  const throttledQ = useThrottle(q, 100)
  const serviceId = useParams()[SERVICE_PARAM_ID] ?? ''
  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      {
        queryHook: useServiceMonitorsQuery,
        keyPath: ['serviceDeployment', 'monitors'],
        skip: !serviceId,
      },
      { q: throttledQ || undefined, serviceId }
    )
  return (
    <WrapperSC>
      <StretchedFlex>
        <Body1P $color="text-light">
          Create and manage log-based monitors for this service.
        </Body1P>
        <Button
          floating
          as={Link}
          to="create"
        >
          Create Monitor
        </Button>
      </StretchedFlex>
      <Input2
        startIcon={<SearchIcon />}
        placeholder="Search monitors"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {error ? (
        <GqlError error={error} />
      ) : (
        <Table
          fullHeightWrap
          data={mapExistingNodes(data?.serviceDeployment?.monitors)}
          columns={cols}
          loading={!data && loading}
          hasNextPage={pageInfo?.hasNextPage}
          fetchNextPage={fetchNextPage}
          isFetchingNextPage={loading}
          onVirtualSliceChange={setVirtualSlice}
          emptyStateProps={{
            message: `No monitors found for ${q ? `"${q}". Try adjusting your filter.` : 'this service.'}`,
          }}
        />
      )}
    </WrapperSC>
  )
}

const columnHelper = createColumnHelper<MonitorTinyFragment>()

const cols = [
  columnHelper.accessor(({ name }) => name, {
    id: 'name',
    header: 'Name',
    cell: ({ getValue }) => getValue(),
  }),
]

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  height: '100%',
}))
