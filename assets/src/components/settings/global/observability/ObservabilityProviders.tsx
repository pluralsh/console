import { Button, LoopingLogo, Table } from '@pluralsh/design-system'

import { useObservabilityProvidersQuery } from 'generated/graphql'

import { useState } from 'react'

import { GqlError } from 'components/utils/Alert'

import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  useFetchPaginatedData,
} from 'components/utils/table/useFetchPaginatedData'

import { SettingsPageHeader } from 'components/settings/Settings'

import { EditObservabilityProviderModal } from './EditObservabilityProvider'
import { columns } from './ObservabilityProvidersColumns'

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
        <Table
          fullHeightWrap
          columns={columns}
          reactTableOptions={{ meta: { refetch } }}
          reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
          data={data?.observabilityProviders?.edges || []}
          virtualizeRows
          hasNextPage={pageInfo?.hasNextPage}
          fetchNextPage={fetchNextPage}
          isFetchingNextPage={loading}
          onVirtualSliceChange={setVirtualSlice}
          emptyStateProps={{ message: 'No providers found.' }}
        />
      </div>
    </div>
  )
}

function AddProviderButton({ refetch }: { refetch: () => void }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        floating
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
