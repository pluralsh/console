import { Flex } from '@pluralsh/design-system'
import {
  AlertsTable,
  ColAlertExpander,
  ColAlertSeverity,
  ColAlertState,
  ColAlertTitle,
  ColAlertUrl,
  getColAlertViewJob,
} from '../../utils/alerts/AlertsTable'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { useWorkbenchAlertsQuery } from 'generated/graphql'
import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { WORKBENCH_PARAM_ID } from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'

export function WorkbenchAlerts() {
  const workbenchId = useParams()[WORKBENCH_PARAM_ID] ?? ''
  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      { queryHook: useWorkbenchAlertsQuery, keyPath: ['workbench', 'alerts'] },
      { id: workbenchId }
    )
  const alerts = useMemo(
    () => mapExistingNodes(data?.workbench?.alerts),
    [data]
  )

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
          workbenchId: alert.workbench?.id ?? workbenchId,
          jobId: alert.workbenchJob.id,
          status: alert.workbenchJob.status,
        }
      }),
    ],
    [workbenchId]
  )

  return (
    <WrapperSC>
      <TableContainerSC>
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
      </TableContainerSC>
    </WrapperSC>
  )
}

const WrapperSC = styled(Flex)(({ theme }) => ({
  flexDirection: 'column',
  flex: 1,
  minHeight: 160,
  overflow: 'hidden',
  padding: `${theme.spacing.medium}px ${theme.spacing.large}px`,
}))

const TableContainerSC = styled.div({
  flex: 1,
  minHeight: 0,
})
