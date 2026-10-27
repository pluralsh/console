import { POLL_INTERVAL } from 'components/cluster/constants'
import { MegaphoneIcon } from '@pluralsh/design-system'
import { WorkbenchTabHeader } from 'components/workbenches/common/WorkbenchTabHeader'
import { WorkbenchTabWrapper } from 'components/workbenches/common/WorkbenchTabWrapper'
import { AlertsTable } from '../utils/alerts/AlertsTable'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { WorkbenchesAlertsDocument } from 'generated/graphql-documents'
import { useMemo } from 'react'
import { mapExistingNodes } from 'utils/graphql'

export function WorkbenchesAlerts() {
  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData({
      pollInterval: POLL_INTERVAL,
      query: WorkbenchesAlertsDocument,
      keyPath: ['workbenchAlerts'],
    })

  const alerts = useMemo(() => mapExistingNodes(data?.workbenchAlerts), [data])

  return (
    <WorkbenchTabWrapper>
      <WorkbenchTabHeader
        title="Alerts"
        icon={<MegaphoneIcon />}
      />
      <AlertsTable
        alerts={alerts}
        loading={!data && loading}
        error={error}
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        setVirtualSlice={setVirtualSlice}
        fillLevel={0}
        rowBg="stripes"
      />
    </WorkbenchTabWrapper>
  )
}
