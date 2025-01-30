import { Button, Card, Flex, PlusIcon, Table } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  useFetchPaginatedData,
} from 'components/utils/table/useFetchPaginatedData'
import {
  ObservabilityWebhookFragment,
  useObservabilityWebhooksQuery,
} from 'generated/graphql'
import { useMemo, useState } from 'react'
import { EditObservabilityWebhookModal } from './EditObservabilityWebhook'
import { columns } from './ObservabilityWebhooksColumns'

export function ObservabilityWebhooks() {
  const {
    data,
    loading,
    error,
    refetch,
    pageInfo,
    fetchNextPage,
    setVirtualSlice,
  } = useFetchPaginatedData({
    queryHook: useObservabilityWebhooksQuery,
    keyPath: ['observabilityWebhooks'],
  })

  const webhooks = useMemo(() => {
    return (
      data?.observabilityWebhooks?.edges
        ?.map((edge) => edge?.node)
        .filter((node): node is ObservabilityWebhookFragment => !!node) ?? []
    )
  }, [data])

  if (error) return <GqlError error={error} />

  return (
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
            <span>Webhooks</span>
            <AddWebhookButton refetch={refetch} />
          </Flex>
        ),
      }}
      css={{ overflow: 'hidden' }}
    >
      <Table
        flush
        fullHeightWrap
        virtualizeRows
        fillLevel={1}
        columns={columns}
        data={webhooks}
        loading={!data && loading}
        reactTableOptions={{ meta: { refetch } }}
        reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        onVirtualSliceChange={setVirtualSlice}
        emptyStateProps={{ message: 'No webhooks found.' }}
      />
    </Card>
  )
}

function AddWebhookButton({ refetch }: { refetch: () => void }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        small
        floating
        startIcon={<PlusIcon />}
        onClick={() => setOpen(true)}
      >
        Add webhook
      </Button>
      <EditObservabilityWebhookModal
        open={open}
        onClose={() => setOpen(false)}
        operationType="create"
        refetch={refetch}
      />
    </>
  )
}
