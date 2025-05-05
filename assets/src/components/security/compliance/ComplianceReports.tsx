import { Flex, Table, useSetBreadcrumbs } from '@pluralsh/design-system'
import {
  COMPLIANCE_REPORTS_ABS_PATH,
  SECURITY_ABS_PATH,
  SECURITY_REL_PATH,
} from 'routes/securityRoutesConsts'

import { createColumnHelper } from '@tanstack/react-table'
import { Edge } from '../../../utils/graphql.ts'
import {
  ComplianceReportFragment,
  useComplianceReportsQuery,
} from '../../../generated/graphql.ts'
import { DateTimeCol } from '../../utils/table/DateTimeCol.tsx'
import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  useFetchPaginatedData,
} from '../../utils/table/useFetchPaginatedData.tsx'
import { GqlError } from '../../utils/Alert.tsx'
import { CreatePolicyReportButton } from '../policies/CreatePolicyReportModal.tsx'
import { useMemo } from 'react'
import { useSetPageHeaderContent } from '../../cd/ContinuousDeployment.tsx'

const columnHelper = createColumnHelper<Edge<ComplianceReportFragment>>()

export const columns = [
  columnHelper.accessor(({ node }) => node?.name, {
    id: 'name',
    header: 'Report name',

    cell: ({ getValue }) => <div>{getValue()}</div>,
  }),
  columnHelper.accessor(({ node }) => node?.sha256, {
    id: 'sha256',
    header: 'SHA256',
    meta: { truncate: true },
    cell: ({ getValue }) => <div>{getValue()}</div>,
  }),
  columnHelper.accessor(({ node }) => node?.insertedAt, {
    id: 'insertedAt',
    header: 'Created',
    enableSorting: true,
    enableGlobalFilter: true,
    cell: ({ getValue }) => <DateTimeCol date={getValue()} />,
  }),
]

const breadcrumbs = [
  { label: SECURITY_REL_PATH, url: SECURITY_ABS_PATH },
  {
    label: 'compliance reports',
    url: COMPLIANCE_REPORTS_ABS_PATH,
  },
]

export function ComplianceReports() {
  useSetBreadcrumbs(breadcrumbs)

  const { data, loading, error, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData({
      queryHook: useComplianceReportsQuery,
      keyPath: ['complianceReports'],
    })

  const header = useMemo(
    () => (
      <Flex>
        <CreatePolicyReportButton />
      </Flex>
    ),
    []
  )

  useSetPageHeaderContent(header)

  if (error) return <GqlError error={error} />

  return (
    <Table
      fullHeightWrap
      virtualizeRows
      data={data?.complianceReports?.edges || []}
      loading={!data && loading}
      columns={columns}
      hasNextPage={data?.complianceReports?.pageInfo?.hasNextPage}
      isFetchingNextPage={loading}
      reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
      onVirtualSliceChange={setVirtualSlice}
      fetchNextPage={fetchNextPage}
    />
  )
}
