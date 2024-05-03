import { useTheme } from 'styled-components'

import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import { LoopingLogo, Table, useSetBreadcrumbs } from '@pluralsh/design-system'

import { useObservabilityProvidersQuery } from 'generated/graphql'

import { ComponentProps, useCallback, useMemo, useState } from 'react'

import { extendConnection } from 'utils/graphql'

import { useSlicePolling } from 'components/utils/tableFetchHelpers'

import { VirtualItem } from '@tanstack/react-virtual'

import { GqlError } from 'components/utils/Alert'

import { ScrollablePage } from 'components/utils/layout/ScrollablePage'

import { StepH } from '../../ModalAlt'

import { POLL_INTERVAL } from '../../ContinuousDeployment'

import { getGlobalSettingsBreadcrumbs } from '../GlobalSettings'

import { columns } from './ObservabilityProvidersColumns'

const REACT_VIRTUAL_OPTIONS: ComponentProps<
  typeof Table
>['reactVirtualOptions'] = {
  overscan: 10,
}
const OBSERVABILITY_PROVIDER_QUERY_PAGE_SIZE = 100

function ObservabilityProviders() {
  const theme = useTheme()

  useSetBreadcrumbs(
    useMemo(
      () => getGlobalSettingsBreadcrumbs({ page: 'observability providers' }),
      []
    )
  )
  const [virtualSlice, _setVirtualSlice] = useState<
    | {
        start: VirtualItem | undefined
        end: VirtualItem | undefined
      }
    | undefined
  >()
  const queryResult = useObservabilityProvidersQuery({
    fetchPolicy: 'cache-and-network',
    variables: {
      first: OBSERVABILITY_PROVIDER_QUERY_PAGE_SIZE,
    },
  })
  const {
    error,
    fetchMore,
    loading,
    data: currentData,
    previousData,
  } = queryResult
  const data = currentData || previousData

  const pageInfo = data?.observabilityProviders?.pageInfo

  const fetchNextPage = useCallback(() => {
    if (!pageInfo?.endCursor) {
      return
    }

    fetchMore({
      variables: { after: pageInfo.endCursor },
      updateQuery: (prev, { fetchMoreResult }) =>
        extendConnection(
          prev,
          fetchMoreResult.observabilityProviders,
          'observabilityProviders'
        ),
    })
  }, [fetchMore, pageInfo?.endCursor])

  const { refetch } = useSlicePolling(queryResult, {
    virtualSlice,
    pageSize: OBSERVABILITY_PROVIDER_QUERY_PAGE_SIZE,
    key: 'observabilityProviders',
    interval: POLL_INTERVAL,
  })

  if (error) {
    return <GqlError error={error} />
  }
  if (!data) {
    return <LoopingLogo />
  }

  return (
    <ScrollablePage heading="Observability Providers">
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          rowGap: theme.spacing.small,
        }}
      >
        <StepH>Providers</StepH>
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
            css={{
              maxHeight: 'unset',
              height: '100%',
            }}
          />
        </FullHeightTableWrap>
      </div>
    </ScrollablePage>
  )
}

export default ObservabilityProviders
