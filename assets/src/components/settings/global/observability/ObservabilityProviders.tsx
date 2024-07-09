import { useTheme } from 'styled-components'

import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import {
  Button,
  LoopingLogo,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'

import { useObservabilityProvidersQuery } from 'generated/graphql'

import { ComponentProps, useMemo, useState } from 'react'

import { GqlError } from 'components/utils/Alert'

import { ScrollablePage } from 'components/utils/layout/ScrollablePage'

import { useFetchPaginatedData } from 'components/cd/utils/useFetchPaginatedData'

import { getGlobalSettingsBreadcrumbs } from '../GlobalSettings'

import { columns } from './ObservabilityProvidersColumns'
import { EditObservabilityProviderModal } from './EditObservabilityProvider'

const REACT_VIRTUAL_OPTIONS: ComponentProps<
  typeof Table
>['reactVirtualOptions'] = {
  overscan: 10,
}
const OBSERVABILITY_PROVIDER_QUERY_PAGE_SIZE = 100

function ObservabilityProviders() {
  useSetBreadcrumbs(
    useMemo(
      () => getGlobalSettingsBreadcrumbs({ page: 'observability providers' }),
      []
    )
  )

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
    <ScrollablePage
      heading="Observability Providers"
      headingContent={<AddProviderButton refetch={refetch} />}
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
            maxHeight: 'unset',
            height: '100%',
          }}
        />
      </FullHeightTableWrap>
    </ScrollablePage>
  )
}

export default ObservabilityProviders

function AddProviderButton({ refetch }: { refetch: () => void }) {
  const [open, setOpen] = useState(false)
  const theme = useTheme()

  return (
    <>
      <Button
        primary
        onClick={() => {
          setOpen(true)
        }}
        css={{ marginRight: theme.spacing.large }}
      >
        New Provider
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
