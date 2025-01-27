import {
  Card,
  ClusterIcon,
  CpuIcon,
  Flex,
  RamIcon,
  Table,
  TagMultiSelectProps,
} from '@pluralsh/design-system'
import { Row } from '@tanstack/react-table'
import { TagsFilter } from 'components/cd/services/ClusterTagsFilter'
import { useProjectId } from 'components/contexts/ProjectsContext'
import { GqlError } from 'components/utils/Alert'
import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  useFetchPaginatedData,
} from 'components/utils/table/useFetchPaginatedData'
import { OverlineH1, Subtitle1H1 } from 'components/utils/typography/Text'
import {
  ClusterUsageTinyFragment,
  Conjunction,
  useClusterUsagesQuery,
} from 'generated/graphql'
import { Key, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'
import { keySetToTagArray } from 'utils/clusterTags'
import {
  ColActions,
  ColCluster,
  ColCpuCost,
  ColCpuEfficiency,
  ColLoadBalancerCost,
  ColMemoryCost,
  ColMemoryEfficiency,
  ColNetworkCost,
} from './ClusterUsagesTableCols'
import {
  CostManagementTreeMap,
  cpuCostByCluster,
  memoryCostByCluster,
} from './CostManagementTreeMap'

export const CM_TREE_MAP_CARD_HEIGHT = 300

export function CostManagement() {
  const theme = useTheme()
  const navigate = useNavigate()
  const projectId = useProjectId()
  const [selectedTagKeys, setSelectedTagKeys] = useState<Set<Key>>(new Set())
  const [tagOp, setTagOp] = useState<Conjunction>(Conjunction.Or)

  const { data, loading, error, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      {
        queryHook: useClusterUsagesQuery,
        pageSize: 500,
        keyPath: ['clusterUsages'],
      },
      {
        projectId,
        tagQuery:
          selectedTagKeys.size > 0
            ? { op: tagOp, tags: keySetToTagArray(selectedTagKeys) }
            : undefined,
      }
    )

  const usages = useMemo(
    () =>
      data?.clusterUsages?.edges
        ?.map((edge) => edge?.node)
        .filter((node): node is ClusterUsageTinyFragment => !!node) || [],
    [data?.clusterUsages?.edges]
  )

  return (
    <WrapperSC>
      <Flex
        justify="space-between"
        align="center"
      >
        <Subtitle1H1>Cost Management</Subtitle1H1>
        <TagsFilter
          selectedTagKeys={selectedTagKeys}
          setSelectedTagKeys={setSelectedTagKeys}
          searchOp={tagOp}
          setSearchOp={setTagOp as TagMultiSelectProps['onChangeMatchType']}
        />
      </Flex>
      <Flex gap="large">
        <Card
          css={{
            padding: theme.spacing.large,
            paddingTop: 0,
            height: CM_TREE_MAP_CARD_HEIGHT,
          }}
          header={{
            outerProps: { style: { flex: 1 } },
            content: (
              <Flex gap="small">
                <CpuIcon />
                <OverlineH1 as="h3">CPU cost by cluster</OverlineH1>
              </Flex>
            ),
          }}
        >
          <CostManagementTreeMap
            colorScheme="blue"
            data={cpuCostByCluster(usages)}
            dataSize={usages.length}
          />
        </Card>
        <Card
          css={{
            padding: theme.spacing.large,
            paddingTop: 0,
            height: CM_TREE_MAP_CARD_HEIGHT,
          }}
          header={{
            outerProps: { style: { flex: 1 } },
            content: (
              <Flex gap="small">
                <RamIcon />
                <OverlineH1 as="h3">memory cost by cluster</OverlineH1>
              </Flex>
            ),
          }}
        >
          <CostManagementTreeMap
            colorScheme="purple"
            data={memoryCostByCluster(usages)}
            dataSize={usages.length}
          />
        </Card>
      </Flex>
      <Card
        css={{ overflow: 'hidden', maxHeight: 500 }}
        header={{
          content: (
            <Flex gap="small">
              <ClusterIcon />
              <OverlineH1 as="h3">clusters</OverlineH1>
            </Flex>
          ),
        }}
      >
        {error ? (
          <GqlError error={error} />
        ) : (
          <Table
            fullHeightWrap
            fillLevel={1}
            virtualizeRows
            flush
            rowBg="base"
            loading={!data && loading}
            columns={cols}
            data={usages}
            onRowClick={(_, row: Row<ClusterUsageTinyFragment>) =>
              navigate(`details/${row.original?.id}`)
            }
            hasNextPage={data?.clusterUsages?.pageInfo?.hasNextPage}
            isFetchingNextPage={loading}
            fetchNextPage={fetchNextPage}
            reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
            onVirtualSliceChange={setVirtualSlice}
          />
        )}
      </Card>
    </WrapperSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  width: '100%',
  padding: theme.spacing.large,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
}))

const cols = [
  ColCluster,
  ColCpuCost,
  ColMemoryCost,
  // ColStorageCost,
  ColLoadBalancerCost,
  ColNetworkCost,
  ColMemoryEfficiency,
  ColCpuEfficiency,
  ColActions,
]
