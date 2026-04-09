import { WorkbenchIssuesTable } from 'components/workbenches/common/WorkbenchIssuesTable'
import { GqlError } from 'components/utils/Alert'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { useWorkbenchIssuesQuery } from 'generated/graphql'
import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { WORKBENCH_PARAM_ID } from 'routes/workbenchesRoutesConsts'
import { mapExistingNodes } from 'utils/graphql'

export function WorkbenchIssues() {
  const workbenchId = useParams()[WORKBENCH_PARAM_ID] ?? ''
  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      { queryHook: useWorkbenchIssuesQuery, keyPath: ['workbench', 'issues'] },
      { id: workbenchId }
    )
  const issues = useMemo(
    () => mapExistingNodes(data?.workbench?.issues),
    [data]
  )

  if (error) return <GqlError error={error} />

  return (
    <WorkbenchIssuesTable
      issues={issues}
      loading={!data && loading}
      hasNextPage={pageInfo?.hasNextPage}
      fetchNextPage={fetchNextPage}
      setVirtualSlice={setVirtualSlice}
      fallbackWorkbenchId={workbenchId}
    />
  )
}
