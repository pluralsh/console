import { Table } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  useFetchPaginatedData,
} from 'components/utils/table/useFetchPaginatedData'
import {
  useVulnerabilityReportsQuery,
  VulnReportGrade,
} from 'generated/graphql'
import { memo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getVulnerabilityReportDetailsPath } from 'routes/securityRoutesConsts'
import {
  ColActions,
  ColGrade,
  ColImage,
  ColNamespaces,
  ColSummary,
} from './VulnReportsTableCols'

export const VulneratbilityReportsTable = memo(
  function VulneratbilityReportsTable({
    selectedClusters,
    selectedNamespaces,
    selectedGrade,
    reportsQ,
  }: {
    selectedClusters?: string[]
    selectedNamespaces?: string[]
    selectedGrade?: VulnReportGrade
    reportsQ?: string
  }) {
    const { clusterId = '' } = useParams()
    const navigate = useNavigate()
    const { data, loading, error, fetchNextPage, setVirtualSlice } =
      useFetchPaginatedData(
        {
          queryHook: useVulnerabilityReportsQuery,
          keyPath: ['vulnerabilityReports'],
        },
        {
          clusters: selectedClusters,
          namespaces: selectedNamespaces,
          grade: selectedGrade,
          q: reportsQ || undefined,
        }
      )

    if (error) return <GqlError error={error} />

    return (
      <FullHeightTableWrap css={{ flex: 1 }}>
        <Table
          virtualizeRows
          data={data?.vulnerabilityReports?.edges || []}
          columns={columns}
          loading={!data && loading}
          css={{ maxHeight: '100%' }}
          onRowClick={(_e, row) => {
            navigate(
              getVulnerabilityReportDetailsPath({
                clusterId,
                vulnerabilityReportId: row.original.node?.id,
              })
            )
          }}
          hasNextPage={data?.vulnerabilityReports?.pageInfo?.hasNextPage}
          isFetchingNextPage={loading}
          fetchNextPage={fetchNextPage}
          reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
          onVirtualSliceChange={setVirtualSlice}
          emptyStateProps={{ message: 'No vulnerability reports found.' }}
        />
      </FullHeightTableWrap>
    )
  }
)

const columns = [ColImage, ColNamespaces, ColGrade, ColSummary, ColActions]
