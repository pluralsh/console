import { Button, Card, Flex, PlusIcon, Table } from '@pluralsh/design-system'

import { useObservabilityProvidersQuery } from 'generated/graphql'

import { useState } from 'react'

import { GqlError } from 'components/utils/Alert'

import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'

import { EditObservabilityProviderModal } from './EditObservabilityProvider'
import { columns } from './ObservabilityProvidersColumns'
import ObservabilitySettings from './ObservabilitySettings'

const OBSERVABILITY_PROVIDERS_TABLE_HEIGHT = '224px'

export function ObservabilityProviders() {
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

  if (error) return <GqlError error={error} />

  return (
    <Flex
      direction="column"
      gap="large"
    >
      <Card
        header={{
          size: 'large',
          content: (
            <Flex
              justify="space-between"
              alignItems="center"
              gap="medium"
              width="100%"
            >
              <span>Providers</span>
              <AddProviderButton refetch={refetch} />
            </Flex>
          ),
        }}
        css={{ maxHeight: OBSERVABILITY_PROVIDERS_TABLE_HEIGHT }}
      >
        <Table
          flush
          fullHeightWrap
          fillLevel={1}
          loadingSkeletonRows={3}
          loading={!data && loading}
          columns={columns}
          reactTableOptions={{ meta: { refetch } }}
          data={data?.observabilityProviders?.edges || []}
          virtualizeRows
          hasNextPage={pageInfo?.hasNextPage}
          fetchNextPage={fetchNextPage}
          isFetchingNextPage={loading}
          onVirtualSliceChange={setVirtualSlice}
          emptyStateProps={{ message: 'No providers found.' }}
        />
      </Card>
      <ObservabilitySettings />
    </Flex>
  )
}

function AddProviderButton({ refetch }: { refetch: () => void }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        small
        floating
        startIcon={<PlusIcon />}
        onClick={() => setOpen(true)}
      >
        Add provider
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
