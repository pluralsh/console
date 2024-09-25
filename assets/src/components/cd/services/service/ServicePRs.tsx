import {
  EmptyState,
  Input,
  LoopingLogo,
  SearchIcon,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { ComponentProps, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import isEmpty from 'lodash/isEmpty'
import {
  CD_REL_PATH,
  SERVICE_PARAM_CLUSTER_ID,
  SERVICE_PARAM_ID,
  SERVICE_PRS_PATH,
} from 'routes/cdRoutesConsts'
import { usePullRequestsQuery } from 'generated/graphql'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { useTheme } from 'styled-components'

import {
  ColActions,
  ColCreator,
  ColInsertedAt,
  ColLabels,
  ColStatus,
  ColTitle,
} from '../../../pr/queue/PrQueueColumns'
import { PRS_REACT_VIRTUAL_OPTIONS } from '../../../pr/queue/PrQueue'
import { GqlError } from '../../../utils/Alert'
import { useThrottle } from '../../../hooks/useThrottle'
import { useFetchPaginatedData } from '../../../utils/table/useFetchPaginatedData'

import {
  getServiceDetailsBreadcrumbs,
  useServiceContext,
} from './ServiceDetails'

export const columns = [
  ColTitle,
  ColStatus,
  ColCreator,
  ColLabels,
  ColInsertedAt,
  ColActions,
]

export default function ServicePRs() {
  const theme = useTheme()
  const { serviceId, clusterId } = useParams<{
    [SERVICE_PARAM_ID]: string
    [SERVICE_PARAM_CLUSTER_ID]: string
  }>()
  const { service } = useServiceContext()

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getServiceDetailsBreadcrumbs({
          cluster: service?.cluster || { id: clusterId || '' },
          service: service || { id: serviceId || '' },
        }),
        {
          label: 'pull requests',
          url: `${CD_REL_PATH}/services/${serviceId}/${SERVICE_PRS_PATH}`,
        },
      ],
      [clusterId, service, serviceId]
    )
  )

  const [searchString, setSearchString] = useState('')
  const debouncedSearchString = useThrottle(searchString, 200)

  const {
    data,
    loading,
    error,
    refetch,
    pageInfo,
    fetchNextPage,
    setVirtualSlice,
  } = useFetchPaginatedData(
    {
      queryHook: usePullRequestsQuery,
      keyPath: ['pullRequests'],
    },
    {
      q: debouncedSearchString,
      serviceId,
    }
  )

  const reactTableOptions: ComponentProps<typeof Table>['reactTableOptions'] = {
    meta: { refetch },
  }

  if (error) return <GqlError error={error} />

  if (!data) return <LoopingLogo />

  return (
    <ScrollablePage
      scrollable={false}
      heading="Pull requests"
    >
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          rowGap: theme.spacing.medium,
          height: '100%',
        }}
      >
        <div
          css={{
            display: 'flex',
            columnGap: theme.spacing.medium,
            flexShrink: 0,
          }}
        >
          <Input
            placeholder="Search"
            startIcon={<SearchIcon />}
            showClearButton
            value={searchString}
            onChange={(e) => setSearchString(e.currentTarget.value)}
            css={{ flexGrow: 1 }}
          />
        </div>
        {isEmpty(data?.pullRequests?.edges) ? (
          <EmptyState message="No pull requests found" />
        ) : (
          <FullHeightTableWrap>
            <Table
              columns={columns}
              reactVirtualOptions={PRS_REACT_VIRTUAL_OPTIONS}
              data={data?.pullRequests?.edges || []}
              virtualizeRows
              reactTableOptions={reactTableOptions}
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
        )}
      </div>
    </ScrollablePage>
  )
}
