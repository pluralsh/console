import { Button, LoopingLogo, Table } from '@pluralsh/design-system'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'

import { useObservabilityProvidersQuery } from 'generated/graphql'

import { ComponentProps, useState } from 'react'

import { GqlError } from 'components/utils/Alert'

import { useFetchPaginatedData } from 'components/cd/utils/useFetchPaginatedData'

import { SettingsPageHeader } from 'components/settings/Settings'

import { EditObservabilityProviderModal } from './EditObservabilityProvider'
import { columns } from './ObservabilityProvidersColumns'

const REACT_VIRTUAL_OPTIONS: ComponentProps<
  typeof Table
>['reactVirtualOptions'] = {
  overscan: 10,
}
const OBSERVABILITY_PROVIDER_QUERY_PAGE_SIZE = 100

const OBSERVABILITY_PROVIDERS_TABLE_HEIGHT = '224px'

export default function ObservabilityProviders() {
  const {
    data,
    loading,
    error,
    refetch,
    pageInfo,
    fetchNextPage,
    setVirtualSlice,
  } = useFetchPaginatedData({
    queryHook: useObservabilityProvidersQuery,
    pageSize: OBSERVABILITY_PROVIDER_QUERY_PAGE_SIZE,
    keyPath: ['observabilityProviders'],
  })

  if (error) {
    return <GqlError error={error} />
  }
  if (!data) {
    return <LoopingLogo />
  }

  return (
    <div>
      <SettingsPageHeader heading="Observability Providers">
        <AddProviderButton refetch={refetch} />
      </SettingsPageHeader>
      <div
        css={{
          height: '100%',
          maxHeight: OBSERVABILITY_PROVIDERS_TABLE_HEIGHT,
          overflow: 'hidden',
        }}
      >
        <FullHeightTableWrap>
          <Table
            columns={columns}
            reactTableOptions={{ meta: { refetch } }}
            reactVirtualOptions={REACT_VIRTUAL_OPTIONS}
            data={data?.observabilityProviders?.edges || []}
            virtualizeRows
            hasNextPage={pageInfo?.hasNextPage}
            fetchNextPage={fetchNextPage}
            isFetchingNextPage={loading}
            onVirtualSliceChange={setVirtualSlice}
            css={{
              height: '100%',
            }}
            emptyStateProps={{ message: 'No providers found.' }}
          />
        </FullHeightTableWrap>
      </div>
    </div>
  )
}

function AddProviderButton({ refetch }: { refetch: () => void }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        secondary
        onClick={() => {
          setOpen(true)
        }}
      >
        Add Provider
      </Button>
      <EditObservabilityProviderModal
        open={open}
        onClose={() => setOpen(false)}
        operationType="create"
        refetch={refetch}
      />
    </>
  )
}
