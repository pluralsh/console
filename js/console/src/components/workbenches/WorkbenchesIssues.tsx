import { TicketIcon } from '@pluralsh/design-system'
import { WorkbenchIssuesTable } from 'components/workbenches/common/WorkbenchIssuesTable'
import { WorkbenchTabHeader } from 'components/workbenches/common/WorkbenchTabHeader'
import { WorkbenchTabWrapper } from 'components/workbenches/common/WorkbenchTabWrapper'
import { GqlError } from 'components/utils/Alert'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import {
  WorkbenchesIssuesDocument,
  WorkbenchesIssuesQuery,
  WorkbenchesIssuesQueryVariables,
} from 'generated/graphql'
import { useMemo } from 'react'
import { mapExistingNodes } from 'utils/graphql'

export function WorkbenchesIssues() {
  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData<
      WorkbenchesIssuesQuery,
      WorkbenchesIssuesQueryVariables
    >({
      query: WorkbenchesIssuesDocument,
      keyPath: ['workbenchIssues'],
    })

  const issues = useMemo(() => mapExistingNodes(data?.workbenchIssues), [data])

  if (error) return <GqlError error={error} />

  return (
    <WorkbenchTabWrapper>
      <WorkbenchTabHeader
        title="Issues"
        icon={<TicketIcon />}
      />
      <WorkbenchIssuesTable
        issues={issues}
        loading={!data && loading}
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        setVirtualSlice={setVirtualSlice}
      />
    </WorkbenchTabWrapper>
  )
}
