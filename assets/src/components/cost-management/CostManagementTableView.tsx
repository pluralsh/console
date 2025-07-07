import { Flex, Table } from '@pluralsh/design-system'
import { Row } from '@tanstack/react-table'
import { TagsFilter } from 'components/cd/services/ClusterTagsFilter'
import { useProjectId } from 'components/contexts/ProjectsContext'
import { GqlError } from 'components/utils/Alert'
import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  useFetchPaginatedData,
} from 'components/utils/table/useFetchPaginatedData'
import {
  ClusterUsageTinyFragment,
  useClusterUsagesQuery,
} from 'generated/graphql'
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
        queryHook: useClusterUsagesQuery,
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
      gap="medium"
      height="100%"
      overflow="hidden"
    >
      <TagsFilter
        selectedTagKeys={tagKeysState[0]}
        setSelectedTagKeys={tagKeysState[1]}
        searchOp={tagOpState[0]}
        setSearchOp={tagOpState[1]}
      />
      <Table
        fullHeightWrap
        fillLevel={1}
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
        reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
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
