import { Flex } from '@pluralsh/design-system'
import { AlertInsight } from 'components/utils/alerts/AlertInsight'
import { AlertsTable } from 'components/utils/alerts/AlertsTable'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { useFlowAlertsQuery } from 'generated/graphql'
import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { mapExistingNodes } from 'utils/graphql'
import type { FlowOutletContext } from './Flow'

export function FlowAlerts() {
  const { flow } = useOutletContext<FlowOutletContext>()
  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      { queryHook: useFlowAlertsQuery, keyPath: ['flow', 'alerts'] },
      { id: flow?.id ?? '' }
    )

  const alerts = useMemo(() => mapExistingNodes(data?.flow?.alerts), [data])

  return (
    <AlertsTable
      alerts={alerts}
      loading={!data && loading}
      error={error}
      hasNextPage={pageInfo?.hasNextPage}
      fetchNextPage={fetchNextPage}
      setVirtualSlice={setVirtualSlice}
    />
  )
}

export function FlowAlertInsight() {
  return (
    <Flex
      padding="large"
      direction="column"
      overflow="hidden"
    >
      <AlertInsight type="flow" />
    </Flex>
  )
}
