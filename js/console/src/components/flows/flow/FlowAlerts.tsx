import { Flex } from '@pluralsh/design-system'
import { AlertInsight } from 'components/utils/alerts/AlertInsight'
import {
  AlertsTable,
  ColAlertExpander,
  ColAlertResolution,
  ColAlertSeverity,
  ColAlertState,
  ColAlertTitle,
  ColAlertUrl,
  getColAlertViewJob,
} from 'components/utils/alerts/AlertsTable'
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
  const columns = useMemo(
    () => [
      ColAlertExpander,
      ColAlertTitle,
      ColAlertUrl,
      ColAlertState,
      ColAlertSeverity,
      getColAlertViewJob((alert) => {
        if (!alert.workbenchJob?.id) return null

        return {
          workbenchId: alert.workbench?.id ?? '',
          jobId: alert.workbenchJob.id,
          status: alert.workbenchJob.status,
        }
      }),
      ColAlertResolution,
    ],
    []
  )

  return (
    <AlertsTable
      alerts={alerts}
      loading={!data && loading}
      error={error}
      hasNextPage={pageInfo?.hasNextPage}
      fetchNextPage={fetchNextPage}
      setVirtualSlice={setVirtualSlice}
      hideHeader
      columns={columns}
      fillLevel={0}
      rowBg="stripes"
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
