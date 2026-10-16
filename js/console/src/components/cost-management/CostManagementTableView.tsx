import { Flex, Table } from '@pluralsh/design-system'
import { Row } from '@tanstack/react-table'
import { useProjectId } from 'components/contexts/ProjectsContext'
import { GqlError } from 'components/utils/Alert'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { ClusterUsageTinyFragment } from 'generated/graphql'
import { ClusterUsagesDocument } from 'generated/graphql-documents'
import { isEmpty } from 'lodash'
import { useMemo } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { getCostManagementDetailsPath } from 'routes/costManagementRoutesConsts'
import { keySetToTagArray } from 'utils/clusterTags'
import { mapExistingNodes } from 'utils/graphql'
import {
  ColActions,
  ColCluster,
  ColCpuCost,
  ColCpuEfficiency,
  ColLoadBalancerCost,
  ColMemoryCost,
  ColMemoryEfficiency,
  ColNetworkCost,
  ColStorageCost,
} from './ClusterUsagesTableCols'
import { CMContextType } from './CostManagement'

export function CostManagementTableView() {
  const navigate = useNavigate()
  const projectId = useProjectId()
  const { tagKeysState, tagOpState } = useOutletContext<CMContextType>()

  const { data, loading, error, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      {
        query: ClusterUsagesDocument,
        pageSize: 500,
        keyPath: ['clusterUsages'],
      },
      {
        projectId,
        tagQuery: !isEmpty(tagKeysState[0])
          ? { op: tagOpState[0], tags: keySetToTagArray(tagKeysState[0]) }
          : undefined,
      }
    )

  const clusterUsages = useMemo(
    () => mapExistingNodes(data?.clusterUsages),
    [data?.clusterUsages]
  )

  if (error) return <GqlError error={error} />

  return (
    <Flex
      direction="column"
      height="100%"
      overflow="hidden"
    >
      <Table
        fullHeightWrap
        // fillLevel={1}
        virtualizeRows
        rowBg="base"
        loading={isEmpty(clusterUsages) && loading}
        columns={cols}
        data={clusterUsages}
        onRowClick={(_, row: Row<ClusterUsageTinyFragment>) =>
          navigate(getCostManagementDetailsPath(row.original?.id))
        }
        hasNextPage={data?.clusterUsages?.pageInfo?.hasNextPage}
        isFetchingNextPage={loading}
        fetchNextPage={fetchNextPage}
        onVirtualSliceChange={setVirtualSlice}
      />
    </Flex>
  )
}

const cols = [
  ColCluster,
  ColCpuCost,
  ColMemoryCost,
  ColStorageCost,
  ColLoadBalancerCost,
  ColNetworkCost,
  ColMemoryEfficiency,
  ColCpuEfficiency,
  ColActions,
]
